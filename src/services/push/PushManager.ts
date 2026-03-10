import { prisma } from '@/lib/db';
import { wechatService } from './WeChatService';
import { reportRenderer } from './ReportRenderer';
import { syslog } from '@/lib/SystemLogger';

export class PushManager {
    async pushDailyReport(orchestratorResult: any) {
        syslog.info('push', `准备推送 ${orchestratorResult.date} 日报`);

        try {
            // 在生产环境中如果无需图片可以统一降级为 Markdown 推送
            const markdownContent = reportRenderer.renderDailyReport(
                orchestratorResult.date,
                orchestratorResult.digest,
                orchestratorResult.tracking || []
            );

            // 如果未配置微信，打印并跳过
            if (!process.env.WECHAT_CORP_ID || !process.env.WECHAT_SECRET) {
                syslog.warn('push', '微信企业号未配置，跳过推送', { markdownLen: markdownContent.length });
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

            syslog.info('push', `微信推送成功`, { date: orchestratorResult.date });
        } catch (err) {
            syslog.error('push', `微信推送失败: ${String(err)}`, { error: String(err) });

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
