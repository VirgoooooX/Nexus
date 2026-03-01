import { orchestrator } from '@/services/engine/OrchestratorService';
import { pushManager } from '@/services/push/PushManager';
import { prisma } from '@/lib/db';
import { formatDateInTimeZone, formatTimeInTimeZone } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 验证 CRON_SECRET
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // 必须配置 CRON_SECRET 并在触发时带上，防止接口被恶意调用
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const timeZone = 'Asia/Shanghai';
        const nowTime = formatTimeInTimeZone(timeZone);
        const today = formatDateInTimeZone(timeZone);

        const [enabledConfig, timeConfig] = await Promise.all([
            prisma.systemConfig.findUnique({ where: { key: 'DAILY_DIGEST_SCHEDULE_ENABLED' } }),
            prisma.systemConfig.findUnique({ where: { key: 'DAILY_DIGEST_SCHEDULE_TIME' } })
        ]);

        const scheduleEnabled = enabledConfig?.value === 'true';
        const scheduleTime = timeConfig?.value || '08:30';

        if (scheduleEnabled && nowTime < scheduleTime) {
            return Response.json({ success: true, skipped: true, reason: 'not_time_yet', nowTime, scheduleTime, today });
        }

        const existing = await prisma.dailyDigest.findUnique({ where: { date: today }, select: { id: true } });
        if (existing) {
            return Response.json({ success: true, skipped: true, reason: 'already_generated', today });
        }

        // 1. 执行编排（搜新闻、搜事件更新、落库）
        const result = await orchestrator.runDaily();

        // 2. 推送图文/Markdown报告
        await pushManager.pushDailyReport(result);

        return Response.json({ success: true, ...result });
    } catch (err: any) {
        console.error('[Cron API] Fatal error:', err);
        return Response.json({ success: false, error: String(err) }, { status: 500 });
    }
}
