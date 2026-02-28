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
        const result = await aiSearchService.summarizeDailyNewsFromArticles(dateStr, articles);

        // 3. Format into Markdown (handling the new theme-based categorization)
        let markdown = `# ${dateStr} 全球新闻日报\n\n`;
        markdown += `> ${result.overallSummary}\n\n`;

        if (result.categories && result.categories.length > 0) {
            result.categories.forEach(cat => {
                markdown += `## ${cat.name}\n\n`;

                // Handle new sub-theme structure
                if (cat.themes && cat.themes.length > 0) {
                    cat.themes.forEach(theme => {
                        markdown += `### ${theme.themeName}\n`;
                        theme.items.forEach(item => {
                            const link = item.url ? `*[${item.source}](${item.url})*` : `*[${item.source}]*`;
                            markdown += `- **${item.headline}**\n  ${item.summary ? item.summary + ' ' : ''}${link}\n`;
                        });
                        markdown += `\n`; // spacing between themes
                    });
                }
                // Handle fallback if AI returns flat items under category
                else if (cat.items && cat.items.length > 0) {
                    cat.items.forEach(item => {
                        const link = item.url ? `*[${item.source}](${item.url})*` : `*[${item.source}]*`;
                        markdown += `- **${item.headline}**\n  ${item.summary ? item.summary + ' ' : ''}${link}\n`;
                    });
                    markdown += `\n`;
                }
            });
        }
        // Backward compatibility with oldest flat format
        else if (result.items && result.items.length > 0) {
            result.items.forEach((item, index) => {
                const link = item.url ? `*[${item.source}](${item.url})*` : `*[${item.source}]*`;
                markdown += `### ${index + 1}. ${item.headline}\n`;
                markdown += `${item.summary ? item.summary + '\n' : ''}${link}\n\n`;
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

        console.log(`[DailyDigestEngine] Digest saved successfully.`);
        return digest;
    }
}

export const dailyDigestEngine = new DailyDigestEngine();
