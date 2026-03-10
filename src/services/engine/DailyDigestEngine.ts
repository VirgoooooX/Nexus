import { prisma } from '@/lib/db';
import { aiSearchService } from '../ai/AISearchService';
import { getCleanedArticles } from '@/lib/readflowClient';
import { syslog } from '@/lib/SystemLogger';

export class DailyDigestEngine {
    async runDailyDigest(dateStr: string) {
        syslog.info('digest', `开始生成 ${dateStr} 日报`);

        // 1. Check if already exists
        const existing = await prisma.dailyDigest.findUnique({
            where: { date: dateStr }
        });

        if (existing) {
            syslog.info('digest', `${dateStr} 日报已存在，跳过生成`, { digestId: existing.id });
            return existing;
        }

        const now = new Date();
        const endIso = now.toISOString();
        const startIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const articles = await getCleanedArticles(startIso, endIso);
        const articleCount = Array.isArray(articles) ? articles.length : 0;
        syslog.info('digest', `获取到 ${articleCount} 篇文章`, { dateStr, range: `${startIso} → ${endIso}`, count: articleCount });

        const activeTrackers = await prisma.trackedEvent.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true, name: true, searchQuery: true }
        });
        const trackerInput = activeTrackers.map((t) => ({ eventId: t.id, eventName: t.name, query: t.searchQuery }));

        if (activeTrackers.length > 0) {
            syslog.info('digest', `加载 ${activeTrackers.length} 个活跃追踪事件`, { events: activeTrackers.map(t => t.name) });
        }

        syslog.info('digest', `正在调用 AI 生成日报摘要...`);
        const result = await aiSearchService.summarizeDailyNewsFromArticles(dateStr, articles, trackerInput);
        syslog.info('digest', `AI 摘要生成完成`, {
            categories: result.categories?.length || 0,
            trackedUpdates: result.trackedUpdates?.length || 0,
            recommendedEvents: result.recommendedEvents?.length || 0,
        });

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

        syslog.info('digest', `日报已保存`, { digestId: digest.id, date: digest.date, markdownLen: markdown.length });
        return digest;
    }
}

export const dailyDigestEngine = new DailyDigestEngine();
