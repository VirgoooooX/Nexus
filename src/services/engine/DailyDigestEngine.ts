import { prisma } from '@/lib/db';
import { aiSearchService } from '../ai/AISearchService';
import { getCleanedArticles } from '@/lib/readflowClient';

export class DailyDigestEngine {
    async runDailyDigest(dateStr: string) {
        console.log(`[DailyDigestEngine] Running summary for ${dateStr}`);

        // 1. Check if already exists
        const existing = await prisma.dailyDigest.findUnique({
            where: { date: dateStr }
        });

        if (existing) {
            console.log(`[DailyDigestEngine] Digest for ${dateStr} already exists. Skipping.`);
            return existing;
        }

        const articles = await getCleanedArticles(dateStr, dateStr);
        console.log(`[DailyDigestEngine] cleanedArticles date=${dateStr} count=${Array.isArray(articles) ? articles.length : 0}`);
        const activeTrackers = await prisma.trackedEvent.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true, name: true, searchQuery: true }
        });
        const trackerInput = activeTrackers.map((t) => ({ eventId: t.id, eventName: t.name, query: t.searchQuery }));
        const result = await aiSearchService.summarizeDailyNewsFromArticles(dateStr, articles, trackerInput);

        // 3. Format into Markdown (handling the new theme-based categorization)
        let markdown = `# ${dateStr} 全球新闻日报\n\n`;
        markdown += `> ${result.overallSummary}\n\n`;

        if (Array.isArray(result.trackedUpdates) && result.trackedUpdates.length > 0) {
            markdown += `## 今日追踪更新\n\n`;
            for (const u of result.trackedUpdates) {
                markdown += `### ${u.eventName}\n\n`;
                for (const h of u.highlights || []) {
                    const citations = Array.isArray(h.citations) ? h.citations : [];
                    const refs =
                        citations.length > 0
                            ? `（${citations.map((c: any) => `[${c.source || '来源'}](${c.url})`).join(', ')}）`
                            : '';
                    markdown += `- ${h.headline}${refs}\n`;
                }
                markdown += `\n`;
            }
        }

        if (result.categories && result.categories.length > 0) {
            result.categories.forEach(cat => {
                markdown += `## ${cat.name}\n\n`;

                // Handle new sub-theme structure
                if (cat.themes && cat.themes.length > 0) {
                    cat.themes.forEach(theme => {
                        markdown += `### ${theme.themeName}\n`;
                        theme.items.forEach(item => {
                            const citations = Array.isArray((item as any).citations) ? (item as any).citations : [];
                            const refs =
                                citations.length > 0
                                    ? `（${citations.map((c: any) => `[${c.source || '来源'}](${c.url})`).join(', ')}）`
                                    : item.url
                                        ? `（[${item.source || '来源'}](${item.url})）`
                                        : '';
                            markdown += `- ${item.headline}${refs}\n`;
                            const bullets = Array.isArray((item as any).bullets) ? (item as any).bullets : [];
                            for (const b of bullets) {
                                if (typeof b !== 'string' || !b.trim()) continue;
                                markdown += `  - ${b.trim()}\n`;
                            }
                        });
                        markdown += `\n`; // spacing between themes
                    });
                }
                // Handle fallback if AI returns flat items under category
                else if (cat.items && cat.items.length > 0) {
                    cat.items.forEach(item => {
                        const citations = Array.isArray((item as any).citations) ? (item as any).citations : [];
                        const refs =
                            citations.length > 0
                                ? `（${citations.map((c: any) => `[${c.source || '来源'}](${c.url})`).join(', ')}）`
                                : item.url
                                    ? `（[${item.source || '来源'}](${item.url})）`
                                    : '';
                        markdown += `- ${item.headline}${refs}\n`;
                        const bullets = Array.isArray((item as any).bullets) ? (item as any).bullets : [];
                        for (const b of bullets) {
                            if (typeof b !== 'string' || !b.trim()) continue;
                            markdown += `  - ${b.trim()}\n`;
                        }
                    });
                    markdown += `\n`;
                }
            });
        }
        // Backward compatibility with oldest flat format
        else if (result.items && result.items.length > 0) {
            result.items.forEach((item, index) => {
                const citations = Array.isArray((item as any).citations) ? (item as any).citations : [];
                const refs =
                    citations.length > 0
                        ? `（${citations.map((c: any) => `[${c.source || '来源'}](${c.url})`).join(', ')}）`
                        : item.url
                            ? `（[${item.source || '来源'}](${item.url})）`
                            : '';
                markdown += `### ${index + 1}. ${item.headline}\n`;
                markdown += `${item.summary ? item.summary + '\n' : ''}${refs}\n\n`;
            });
        }

        // 4. Save to DB
        const digest = await prisma.dailyDigest.create({
            data: {
                date: dateStr,
                content: markdown,
                recommendedEvents: JSON.stringify(result.recommendedEvents || []),
                rawJson: JSON.stringify(result)
            }
        });

        console.log(`[DailyDigestEngine] Digest saved successfully. id=${digest.id} date=${digest.date}`);
        return digest;
    }
}

export const dailyDigestEngine = new DailyDigestEngine();
