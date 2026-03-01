import OpenAI from 'openai';
import { Citation, IAIProvider, DailyNewsResult, EventUpdateResult, SynthesisResult, TrackedUpdate } from './types';
import { DAILY_NEWS_PROMPT, EVENT_UPDATE_PROMPT, SYNTHESIS_PROMPT } from './prompts';

export class AISearchService implements IAIProvider {
    private _client: OpenAI | null = null;
    private _model: string | null = null;

    constructor() { }

    private get client(): OpenAI {
        if (!this._client) {
            this._client = new OpenAI({
                apiKey: process.env.AI_API_KEY!,
                baseURL: process.env.AI_BASE_URL!,
            });
        }
        return this._client;
    }

    private get model(): string {
        if (!this._model) {
            this._model = process.env.AI_MODEL || 'gpt-4o';
        }
        return this._model;
    }

    private getModelTokenLimits() {
        const m = this.model.toLowerCase();

        if (m.includes('gemini-3') && m.includes('pro')) {
            return { input: 1_048_576, output: 65_536 };
        }
        if (m.includes('gemini')) {
            return { input: 1_048_576, output: 65_536 };
        }
        if (m.includes('gpt-4o')) {
            return { input: 128_000, output: 16_384 };
        }
        return { input: 128_000, output: 8_192 };
    }

    private estimateTokensForText(text: string) {
        let ascii = 0;
        let nonAscii = 0;
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i);
            if (code <= 0x7f) ascii += 1;
            else nonAscii += 1;
        }
        return Math.ceil(ascii / 4 + nonAscii / 1.5);
    }

    private buildArticleSummary(content: unknown, maxChars: number) {
        const raw = typeof content === 'string' ? content : '';
        const cleaned = raw.replace(/\s+/g, ' ').trim();
        if (cleaned.length <= maxChars) return cleaned;
        return cleaned.slice(0, maxChars);
    }

    private prepareArticlesWithinBudget(promptPrefix: string, articles: unknown[]) {
        const limits = this.getModelTokenLimits();
        const reservedOutput = Math.min(16_384, Math.max(4_096, Math.floor(limits.output / 4)));
        const safetyMargin = Math.min(32_768, Math.max(8_192, Math.floor(limits.input * 0.05)));
        const inputBudget = Math.max(1, limits.input - reservedOutput - safetyMargin);

        const buildPrompt = (a: unknown[]) => `${promptPrefix}\n\n<articles_json>\n${JSON.stringify(a)}\n</articles_json>\n`;

        const fullPrompt = buildPrompt(articles);
        const fullTokens = this.estimateTokensForText(fullPrompt);
        if (fullTokens <= inputBudget) {
            return { prompt: fullPrompt, mode: 'full' as const, estimatedTokens: fullTokens, inputBudget, limits };
        }

        let summaryChars = 500;
        let summarized = articles.map((x: any) => {
            const title = typeof x?.title === 'string' ? x.title : '';
            const url = typeof x?.url === 'string' ? x.url : '';
            const sourceName = typeof x?.sourceName === 'string' ? x.sourceName : '';
            const publishedAt = typeof x?.publishedAt === 'string' ? x.publishedAt : '';
            const summary = this.buildArticleSummary(x?.content, summaryChars);
            return { title, url, sourceName, publishedAt, summary, content: summary };
        });

        while (summaryChars >= 80) {
            const p = buildPrompt(summarized);
            const t = this.estimateTokensForText(p);
            if (t <= inputBudget) {
                return { prompt: p, mode: 'summary' as const, estimatedTokens: t, inputBudget, limits };
            }
            summaryChars = Math.floor(summaryChars / 2);
            summarized = summarized.map((x: any) => {
                const s = typeof x?.summary === 'string' ? x.summary : '';
                const next = s.length <= summaryChars ? s : s.slice(0, summaryChars);
                return { ...x, summary: next, content: next };
            });
        }

        const minimal = articles.map((x: any) => ({
            title: typeof x?.title === 'string' ? x.title : '',
            url: typeof x?.url === 'string' ? x.url : '',
            sourceName: typeof x?.sourceName === 'string' ? x.sourceName : '',
            publishedAt: typeof x?.publishedAt === 'string' ? x.publishedAt : '',
        }));
        const p2 = buildPrompt(minimal);
        const t2 = this.estimateTokensForText(p2);
        return { prompt: p2, mode: 'title_only' as const, estimatedTokens: t2, inputBudget, limits };
    }

    private async chat(prompt: string): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
        });
        return response.choices[0]?.message?.content || '';
    }

    private parseJSON<T>(raw: string): T {
        // 去掉可能的 markdown 代码块标记
        let cleaned = raw.trim();
        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.replace(/```json\n?/g, '');
        }
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/```\n?/g, '');
        }
        cleaned = cleaned.replace(/```\n?$/g, '').trim();

        return JSON.parse(cleaned) as T;
    }

    private buildAllowedUrlToSource(articles: unknown[]) {
        const m = new Map<string, string>();
        for (const a of articles) {
            const url = typeof (a as any)?.url === 'string' ? (a as any).url.trim() : '';
            if (!url) continue;
            const source = typeof (a as any)?.sourceName === 'string' ? (a as any).sourceName.trim() : '';
            if (source) m.set(url, source);
            else if (!m.has(url)) m.set(url, '');
        }
        return m;
    }

    private normalizeCitations(raw: unknown, allowedUrlToSource?: Map<string, string>) {
        const list = Array.isArray(raw) ? raw : [];
        const out: Citation[] = [];
        const seen = new Set<string>();
        for (const c of list) {
            if (typeof c !== 'object' || c === null) continue;
            const url = typeof (c as any).url === 'string' ? (c as any).url.trim() : '';
            if (!url) continue;
            if (allowedUrlToSource && !allowedUrlToSource.has(url)) continue;
            if (seen.has(url)) continue;
            seen.add(url);
            const fallbackSource = allowedUrlToSource ? allowedUrlToSource.get(url) || '' : '';
            const source = typeof (c as any).source === 'string' ? (c as any).source.trim() : fallbackSource;
            out.push({ source, url });
            if (out.length >= 3) break;
        }
        return out;
    }

    private normalizeNewsItem(x: any, allowedUrlToSource?: Map<string, string>) {
        const headline = typeof x?.headline === 'string' ? x.headline : '';
        const summary = typeof x?.summary === 'string' ? x.summary : undefined;

        const directCitations = this.normalizeCitations(x?.citations, allowedUrlToSource);
        const legacyUrl = typeof x?.url === 'string' ? x.url.trim() : '';
        const legacySource = typeof x?.source === 'string' ? x.source.trim() : '';
        const legacyEvidenceUrls = Array.isArray(x?.evidenceUrls)
            ? x.evidenceUrls.filter((u: unknown) => typeof u === 'string').map((u: string) => u.trim()).filter(Boolean)
            : [];

        const citations: Citation[] = directCitations.length > 0 ? directCitations : [];
        const pushLegacy = (url: string, source?: string) => {
            if (!url) return;
            if (allowedUrlToSource && !allowedUrlToSource.has(url)) return;
            if (citations.some((c) => c.url === url)) return;
            const fallbackSource = allowedUrlToSource ? allowedUrlToSource.get(url) || '' : '';
            citations.push({ source: (source || fallbackSource).trim(), url });
        };
        if (citations.length === 0) {
            pushLegacy(legacyUrl, legacySource);
            for (const u of legacyEvidenceUrls) pushLegacy(u);
        }
        const url = citations[0]?.url || (allowedUrlToSource && allowedUrlToSource.has(legacyUrl) ? legacyUrl : '');
        if (!headline || citations.length === 0) return null;
        return { headline, summary, url, citations, source: legacySource || undefined, evidenceUrls: legacyEvidenceUrls.length ? legacyEvidenceUrls.slice(0, 3) : undefined };
    }

    private normalizeTrackedUpdates(
        raw: unknown,
        allowedUrlToSource: Map<string, string> | undefined,
        allowedEventIds: Set<string> | undefined,
        eventNameById: Map<string, string> | undefined
    ): TrackedUpdate[] {
        const list = Array.isArray(raw) ? raw : [];
        const out: TrackedUpdate[] = [];
        for (const u of list) {
            if (typeof u !== 'object' || u === null) continue;
            const eventId = typeof (u as any).eventId === 'string' ? (u as any).eventId : '';
            if (!eventId) continue;
            if (allowedEventIds && !allowedEventIds.has(eventId)) continue;
            const eventName =
                typeof (u as any).eventName === 'string'
                    ? (u as any).eventName
                    : eventNameById
                        ? eventNameById.get(eventId) || ''
                        : '';
            const reason = typeof (u as any).reason === 'string' ? (u as any).reason : undefined;
            const highlightsRaw = Array.isArray((u as any).highlights) ? (u as any).highlights : [];
            const highlights = highlightsRaw
                .filter((h: unknown) => typeof h === 'object' && h !== null)
                .map((h: any) => {
                    const headline = typeof h?.headline === 'string' ? h.headline : '';
                    const summary = typeof h?.summary === 'string' ? h.summary : undefined;
                    const citations = this.normalizeCitations(h?.citations, allowedUrlToSource);
                    if (!headline || citations.length === 0) return null;
                    return { headline, summary, citations };
                })
                .filter(Boolean)
                .slice(0, 4) as any;
            if (highlights.length === 0) continue;
            out.push({ eventId, eventName, reason, highlights });
        }
        return out;
    }

    private normalizeDailyNewsResult(
        raw: DailyNewsResult,
        allowedUrlToSource?: Map<string, string>,
        allowedEventIds?: Set<string>,
        eventNameById?: Map<string, string>
    ): DailyNewsResult {
        const normalizeItemsArray = (itemsRaw: unknown) => {
            const items = Array.isArray(itemsRaw) ? itemsRaw : [];
            return items
                .map((x: any) => this.normalizeNewsItem(x, allowedUrlToSource))
                .filter((x): x is NonNullable<typeof x> => x !== null) as any;
        };

        const categories = Array.isArray((raw as any)?.categories) ? (raw as any).categories : [];
        const normalizedCategories = categories
            .filter((c: unknown) => typeof c === 'object' && c !== null)
            .map((c: any) => {
                const themes = Array.isArray(c?.themes) ? c.themes : undefined;
                const items = Array.isArray(c?.items) ? c.items : undefined;
                return {
                    name: typeof c?.name === 'string' ? c.name : '',
                    icon: typeof c?.icon === 'string' ? c.icon : '',
                    themes: themes
                        ? themes
                            .filter((t: unknown) => typeof t === 'object' && t !== null)
                            .map((t: any) => ({
                                themeName: typeof t?.themeName === 'string' ? t.themeName : '',
                                items: normalizeItemsArray(t?.items),
                            }))
                        : undefined,
                    items: items ? normalizeItemsArray(items) : undefined,
                };
            });

        return {
            date: typeof (raw as any)?.date === 'string' ? (raw as any).date : '',
            overallSummary: typeof (raw as any)?.overallSummary === 'string' ? (raw as any).overallSummary : '',
            categories: normalizedCategories,
            items: normalizeItemsArray((raw as any)?.items),
            recommendedEvents: Array.isArray((raw as any)?.recommendedEvents)
                ? (raw as any).recommendedEvents
                    .filter((e: unknown) => typeof e === 'object' && e !== null)
                    .map((e: any) => ({
                        name: typeof e?.name === 'string' ? e.name : '',
                        query: typeof e?.query === 'string' ? e.query : '',
                        reason: typeof e?.reason === 'string' ? e.reason : '',
                    }))
                : [],
            trackedUpdates: this.normalizeTrackedUpdates((raw as any)?.trackedUpdates, allowedUrlToSource, allowedEventIds, eventNameById),
        };
    }

    private async buildDailyNewsPrompt(date: string, articles: unknown[], activeTrackers: unknown[]): Promise<string> {
        let promptText = '';
        try {
            const { prisma } = await import('@/lib/db');
            const customConfig = await prisma.systemConfig.findUnique({ where: { key: 'DAILY_NEWS_PROMPT_TEMPLATE' } });
            if (customConfig && customConfig.value) {
                promptText = customConfig.value.replace(/\$\{date\}/g, date);
            } else {
                promptText = DAILY_NEWS_PROMPT(date);
            }
        } catch (e) {
            console.error('[AISearchService] failed to fetch custom prompt:', e);
            promptText = DAILY_NEWS_PROMPT(date);
        }

        const promptWithTrackers = `${promptText}\n\n<active_trackers_json>\n${JSON.stringify(activeTrackers)}\n</active_trackers_json>\n`;
        const prepared = this.prepareArticlesWithinBudget(promptWithTrackers, articles);
        if (prepared.mode !== 'full') {
            console.warn(
                `[AISearchService] daily digest input downgraded mode=${prepared.mode} est=${prepared.estimatedTokens} budget=${prepared.inputBudget} model=${this.model}`
            );
        }
        return prepared.prompt;
    }

    async searchDailyNews(date: string): Promise<DailyNewsResult> {
        const raw = await this.chat(DAILY_NEWS_PROMPT(date));
        return this.normalizeDailyNewsResult(this.parseJSON<DailyNewsResult>(raw));
    }

    async summarizeDailyNewsFromArticles(
        date: string,
        articles: unknown[],
        activeTrackers: Array<{ eventId: string; eventName: string; query: string }> = []
    ): Promise<DailyNewsResult> {
        const promptText = await this.buildDailyNewsPrompt(date, articles, activeTrackers);
        const raw = await this.chat(promptText);
        const allowedUrlToSource = this.buildAllowedUrlToSource(articles);
        const allowedEventIds = new Set(activeTrackers.map((t) => t.eventId));
        const eventNameById = new Map(activeTrackers.map((t) => [t.eventId, t.eventName]));
        return this.normalizeDailyNewsResult(this.parseJSON<DailyNewsResult>(raw), allowedUrlToSource, allowedEventIds, eventNameById);
    }

    async searchEventUpdate(eventName: string, searchQuery: string, lastCheckedDate: string): Promise<EventUpdateResult> {
        const raw = await this.chat(EVENT_UPDATE_PROMPT(eventName, searchQuery, lastCheckedDate));
        return this.parseJSON<EventUpdateResult>(raw);
    }

    async searchEventUpdateFromArticles(
        eventName: string,
        searchQuery: string,
        lastCheckedDate: string,
        articles: unknown[]
    ): Promise<EventUpdateResult> {
        const base = EVENT_UPDATE_PROMPT(eventName, searchQuery, lastCheckedDate);
        const prepared = this.prepareArticlesWithinBudget(base, articles);
        if (prepared.mode !== 'full') {
            console.warn(
                `[AISearchService] tracker input downgraded mode=${prepared.mode} est=${prepared.estimatedTokens} budget=${prepared.inputBudget} model=${this.model}`
            );
        }
        const promptText = prepared.prompt;
        const raw = await this.chat(promptText);
        const parsed = this.parseJSON<EventUpdateResult>(raw);
        const allowedUrls = new Set<string>();
        for (const a of articles) {
            const url = typeof (a as any)?.url === 'string' ? (a as any).url.trim() : '';
            if (url) allowedUrls.add(url);
        }

        const nodesRaw = Array.isArray((parsed as any)?.nodes) ? (parsed as any).nodes : [];
        const nodes = nodesRaw
            .filter((n: unknown) => typeof n === 'object' && n !== null)
            .map((n: any) => {
                const sourcesRaw = Array.isArray(n?.sources) ? n.sources : [];
                const sources = Array.from(
                    new Set(
                        sourcesRaw
                            .filter((s: unknown) => typeof s === 'string')
                            .map((s: string) => s.trim())
                            .filter((s: string) => s && allowedUrls.has(s))
                    )
                );
                return {
                    date: typeof n?.date === 'string' ? n.date : '',
                    headline: typeof n?.headline === 'string' ? n.headline : '',
                    content: typeof n?.content === 'string' ? n.content : '',
                    sources,
                };
            })
            .filter((n: any) => n.sources.length > 0 && n.headline);

        if (nodes.length === 0) {
            return { hasUpdate: false, nodes: [] };
        }
        const hasUpdate = Boolean((parsed as any)?.hasUpdate);
        return { hasUpdate, nodes };
    }

    async synthesizeGlobalSummary(eventName: string, oldSummary: string, newNodes: string): Promise<SynthesisResult> {
        const raw = await this.chat(SYNTHESIS_PROMPT(eventName, oldSummary, newNodes));
        return this.parseJSON<SynthesisResult>(raw);
    }
}

// 单例导出
export const aiSearchService = new AISearchService();
