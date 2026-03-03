import { stripHtmlToText, truncateText } from '@/lib/utils';
import { decodeGoogleNewsUrl as decodeGoogleNewsUrlDefault } from '@/lib/googleNewsUrlDecoder';

export type CleanRequest = {
    url: string;
    title?: string | null;
    sourceName?: string | null;
    publishedAt?: string | null;
    content?: string | null;
};

export type CleanResult = {
    url: string;
    title: string;
    content: string;
    strategy: string;
    warnings?: string[];
};

type Deps = {
    decodeGoogleNewsUrl?: (url: string) => Promise<string | null>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getStringField(obj: Record<string, unknown>, key: string): string | null {
    const v = obj[key];
    return typeof v === 'string' ? v : null;
}

export function parseCleanRequest(input: unknown): CleanRequest | null {
    if (!isRecord(input)) return null;
    const url = getStringField(input, 'url');
    if (!url) return null;
    return {
        url,
        title: getStringField(input, 'title'),
        sourceName: getStringField(input, 'sourceName'),
        publishedAt: getStringField(input, 'publishedAt'),
        content: getStringField(input, 'content'),
    };
}

function looksLikeGoogleNewsUrl(url: string): boolean {
    try {
        const u = new URL(url);
        if (u.hostname !== 'news.google.com') return false;
        return u.pathname.includes('/rss/articles/') || u.pathname.includes('/articles/') || u.pathname.includes('/read/');
    } catch {
        return false;
    }
}

function extractGoogleNewsAggregateText(html: string): string | null {
    const s = String(html || '');
    if (!s.includes('<ol') || !s.includes('<li')) return null;

    const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
    const aRe = /<a\b[^>]*>([\s\S]*?)<\/a>/i;
    const fontRe = /<font\b[^>]*>([\s\S]*?)<\/font>/i;

    const lines: string[] = [];
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = liRe.exec(s))) {
        const block = m[1] || '';
        const a = aRe.exec(block);
        const font = fontRe.exec(block);
        const title = a ? stripHtmlToText(a[1] || '') : '';
        const source = font ? stripHtmlToText(font[1] || '') : '';

        const t = title.trim();
        if (!t) continue;
        const line = source.trim() ? `${source.trim()}：${t}` : t;
        if (seen.has(line)) continue;
        seen.add(line);
        lines.push(line);
    }

    const out = lines.join('\n');
    return out.trim() ? out : null;
}

function isDongqiudiMorningBrief(input: CleanRequest): boolean {
    const title = String(input.title || '');
    const html = String(input.content || '');
    const url = String(input.url || '');
    const source = String(input.sourceName || '');
    const hostOk = (() => {
        try {
            return new URL(url).hostname.endsWith('dongqiudi.com');
        } catch {
            return url.includes('dongqiudi.com');
        }
    })();
    if (!(hostOk || source.includes('懂球帝'))) return false;
    if (title.startsWith('早报：')) return true;
    if (html.includes('头条新闻') && html.includes('24小时热点新闻')) return true;
    return false;
}

function normalizeDongqiudiItemTitle(raw: string): string {
    let s = String(raw || '').trim();
    if (s.startsWith('【') && s.endsWith('】')) s = s.slice(1, -1).trim();
    s = s.replace(/^剑南春\s*[｜|\-|｜|\|]+\s*/g, '');
    s = s.replace(/^[\u3010\u3011\[\]\(\)（）]+/g, '').trim();
    return s;
}

function extractDongqiudiSections(html: string): Record<string, string> {
    const s = String(html || '');
    const h2Re = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
    const hits: Array<{ name: string; start: number; end: number }> = [];
    const sectionNames = new Set(['头条新闻', '24小时热点新闻', '比赛预告']);
    let m: RegExpExecArray | null;
    while ((m = h2Re.exec(s))) {
        const name = stripHtmlToText(m[1] || '').trim();
        if (!name || !sectionNames.has(name)) continue;
        hits.push({ name, start: m.index, end: h2Re.lastIndex });
    }
    if (hits.length === 0) return {};
    const out: Record<string, string> = {};
    for (let i = 0; i < hits.length; i++) {
        const cur = hits[i];
        const next = hits[i + 1];
        const body = s.slice(cur.end, next ? next.start : s.length);
        out[cur.name] = body;
    }
    return out;
}

function extractDongqiudiLinks(sectionHtml: string): Array<{ title: string; url: string }> {
    const s = String(sectionHtml || '');
    const aRe = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const items: Array<{ title: string; url: string }> = [];
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = aRe.exec(s))) {
        const url = String(m[1] || '').trim();
        if (!url) continue;
        if (!url.includes('dongqiudi.com/article/') && !url.includes('dongqiudi.com/articles/')) continue;
        const title = normalizeDongqiudiItemTitle(stripHtmlToText(m[2] || ''));
        if (!title) continue;
        const key = `${title}@@${url}`;
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({ title, url });
    }
    return items;
}

function extractDongqiudiScheduleLines(sectionHtml: string): string[] {
    const text = stripHtmlToText(sectionHtml || '');
    const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    const out: string[] = [];
    for (const line of lines) {
        if (/\b\d{1,2}:\d{2}\b/.test(line) || /月\d{1,2}日/.test(line) || /今天|明天/.test(line)) {
            out.push(line);
        }
    }
    return out;
}

async function cleanGoogleNews(input: CleanRequest, deps: Deps): Promise<CleanResult> {
    const decode = deps.decodeGoogleNewsUrl || decodeGoogleNewsUrlDefault;
    const warnings: string[] = [];
    let canonicalUrl = input.url;
    try {
        const resolved = await decode(input.url);
        if (resolved) canonicalUrl = resolved;
        else warnings.push('decode_failed');
    } catch {
        warnings.push('decode_failed');
    }
    const aggregated = extractGoogleNewsAggregateText(String(input.content || ''));
    const contentInput = aggregated || input.content || input.title || '';
    return {
        url: canonicalUrl,
        title: String(input.title || '').trim(),
        content: truncateText(stripHtmlToText(contentInput), 1500),
        strategy: 'google_news',
        warnings: warnings.length ? warnings : undefined,
    };
}

async function cleanDongqiudiMorningBrief(input: CleanRequest): Promise<CleanResult> {
    const html = String(input.content || '');
    const sections = extractDongqiudiSections(html);

    const headline = sections['头条新闻'] ? extractDongqiudiLinks(sections['头条新闻']) : [];
    const hot = sections['24小时热点新闻'] ? extractDongqiudiLinks(sections['24小时热点新闻']) : [];
    const schedule = sections['比赛预告'] ? extractDongqiudiScheduleLines(sections['比赛预告']) : [];

    const blocks: string[] = [];
    const mainTitle = String(input.title || '').trim();
    if (mainTitle) blocks.push(mainTitle);

    if (headline.length) {
        blocks.push('', '头条新闻');
        for (const it of headline.slice(0, 6)) blocks.push(`- ${it.title} - ${it.url}`);
    }

    if (hot.length) {
        blocks.push('', '24小时热点新闻');
        for (const it of hot.slice(0, 12)) blocks.push(`- ${it.title} - ${it.url}`);
    }

    if (schedule.length) {
        blocks.push('', '比赛预告');
        for (const line of schedule.slice(0, 20)) blocks.push(`- ${line}`);
    }

    const content = blocks.join('\n').trim();
    return {
        url: input.url,
        title: mainTitle,
        content: truncateText(content, 20000),
        strategy: 'dongqiudi_morning_brief',
    };
}

export async function cleanOne(input: CleanRequest, deps: Deps = {}): Promise<CleanResult> {
    const url = String(input.url || '').trim();
    const title = String(input.title || '').trim();
    const content = String(input.content || '');
    const normalized: CleanRequest = { ...input, url, title, content };

    if (looksLikeGoogleNewsUrl(url)) return cleanGoogleNews(normalized, deps);
    if (isDongqiudiMorningBrief(normalized)) return cleanDongqiudiMorningBrief(normalized);

    const fallbackInput = normalized.content || normalized.title || '';
    return {
        url: normalized.url,
        title,
        content: truncateText(stripHtmlToText(fallbackInput), 1500),
        strategy: 'generic_html_fallback',
    };
}

export async function cleanBatch(
    items: CleanRequest[],
    deps: Deps = {}
): Promise<Array<{ inputUrl: string; result?: CleanResult; error?: string }>> {
    if (!Array.isArray(items) || items.length === 0) return [];
    const out: Array<{ inputUrl: string; result?: CleanResult; error?: string }> = [];
    for (const item of items) {
        const inputUrl = String(item?.url || '');
        try {
            const result = await cleanOne(item, deps);
            out.push({ inputUrl, result });
        } catch (e: unknown) {
            out.push({ inputUrl, error: String(e) });
        }
    }
    return out;
}
