import OpenAI from 'openai';
import { IAIProvider, DailyNewsResult, EventUpdateResult, SynthesisResult } from './types';
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

    private async buildDailyNewsPrompt(date: string, articles: unknown[]): Promise<string> {
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

        const materials = JSON.stringify(articles);
        return `${promptText}\n\n<articles_json>\n${materials}\n</articles_json>\n`;
    }

    async searchDailyNews(date: string): Promise<DailyNewsResult> {
        const raw = await this.chat(DAILY_NEWS_PROMPT(date));
        return this.parseJSON<DailyNewsResult>(raw);
    }

    async summarizeDailyNewsFromArticles(date: string, articles: unknown[]): Promise<DailyNewsResult> {
        const promptText = await this.buildDailyNewsPrompt(date, articles);
        const raw = await this.chat(promptText);
        return this.parseJSON<DailyNewsResult>(raw);
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
        const promptText = `${EVENT_UPDATE_PROMPT(eventName, searchQuery, lastCheckedDate)}\n\n<articles_json>\n${JSON.stringify(articles)}\n</articles_json>\n`;
        const raw = await this.chat(promptText);
        return this.parseJSON<EventUpdateResult>(raw);
    }

    async synthesizeGlobalSummary(eventName: string, oldSummary: string, newNodes: string): Promise<SynthesisResult> {
        const raw = await this.chat(SYNTHESIS_PROMPT(eventName, oldSummary, newNodes));
        return this.parseJSON<SynthesisResult>(raw);
    }
}

// 单例导出
export const aiSearchService = new AISearchService();
