import { orchestrator } from '@/services/engine/OrchestratorService';
import { pushManager } from '@/services/push/PushManager';

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
