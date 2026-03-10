import { orchestrator } from '@/services/engine/OrchestratorService';
import { pushManager } from '@/services/push/PushManager';
import { prisma } from '@/lib/db';
import { formatDateInTimeZone, formatTimeInTimeZone } from '@/lib/utils';
import { syslog } from '@/lib/SystemLogger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 验证 CRON_SECRET
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    syslog.info('cron', `定时任务触发`);

    // 必须配置 CRON_SECRET 并在触发时带上，防止接口被恶意调用
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        syslog.warn('cron', '定时任务鉴权失败');
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const timeZone = 'Asia/Shanghai';
        const nowTime = formatTimeInTimeZone(timeZone);
        const today = formatDateInTimeZone(timeZone);
        syslog.info('cron', `当前时间 ${nowTime}，日期 ${today}`);

        const [enabledConfig, timeConfig] = await Promise.all([
            prisma.systemConfig.findUnique({ where: { key: 'DAILY_DIGEST_SCHEDULE_ENABLED' } }),
            prisma.systemConfig.findUnique({ where: { key: 'DAILY_DIGEST_SCHEDULE_TIME' } })
        ]);

        const scheduleEnabled = enabledConfig?.value === 'true';
        const scheduleTime = timeConfig?.value || '08:30';

        if (!scheduleEnabled) {
            syslog.info('cron', '定时生成未启用，跳过');
            return Response.json({ success: true, skipped: true, reason: 'schedule_disabled', today });
        }

        if (nowTime < scheduleTime) {
            syslog.info('cron', `未到计划时间，跳过`, { nowTime, scheduleTime });
            return Response.json({ success: true, skipped: true, reason: 'not_time_yet', nowTime, scheduleTime, today });
        }

        const existing = await prisma.dailyDigest.findUnique({ where: { date: today }, select: { id: true } });
        if (existing) {
            syslog.info('cron', `今日日报已存在，跳过`, { digestId: existing.id });
            return Response.json({ success: true, skipped: true, reason: 'already_generated', today });
        }

        // 1. 执行编排（搜新闻、搜事件更新、落库）
        syslog.info('cron', `开始执行每日编排任务`);
        const result = await orchestrator.runDaily();
        syslog.info('cron', `编排完成`, { digestId: (result as any)?.digest?.id || '' });

        // 2. 推送图文/Markdown报告
        await pushManager.pushDailyReport(result);
        syslog.info('cron', `推送流程完成`);

        return Response.json({ success: true, ...result });
    } catch (err: any) {
        syslog.error('cron', `定时任务执行失败: ${String(err)}`, { error: String(err) });
        return Response.json({ success: false, error: String(err) }, { status: 500 });
    }
}
