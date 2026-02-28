import { prisma } from '@/lib/db';
import { wechatService } from './WeChatService';
import { reportRenderer } from './ReportRenderer';

export class PushManager {
    async pushDailyReport(orchestratorResult: any) {
        console.log(`[PushManager] Preparing to push daily report for ${orchestratorResult.date}...`);

        try {
            // 在生产环境中如果无需图片可以统一降级为 Markdown 推送
            const markdownContent = reportRenderer.renderDailyReport(
                orchestratorResult.date,
                orchestratorResult.digest,
                orchestratorResult.tracking || []
            );

            // 如果未配置微信，打印并跳过
            if (!process.env.WECHAT_CORP_ID || !process.env.WECHAT_SECRET) {
                console.log(`[PushManager] WeChat not configured. Dumping markdown to console instead:`);
                console.log("------------------");
                console.log(markdownContent);
                console.log("------------------");
                return;
            }

            await wechatService.sendMarkdown(markdownContent);

            await prisma.pushLog.create({
                data: {
                    channel: 'wechat',
                    status: 'success',
                    title: `Nexus Daily Hash: ${orchestratorResult.date}`
                }
            });

            console.log(`[PushManager] Push successful.`);
        } catch (err) {
            console.error(`[PushManager] Push failed:`, err);

            await prisma.pushLog.create({
                data: {
                    channel: 'wechat',
                    status: 'failed',
                    title: `Nexus Daily Hash: ${orchestratorResult.date}`,
                    error: String(err)
                }
            });
        }
    }
}

export const pushManager = new PushManager();
