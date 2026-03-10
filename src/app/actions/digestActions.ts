'use server';

import { prisma } from '@/lib/db';
import { orchestrator } from '@/services/engine/OrchestratorService';
import { revalidatePath } from 'next/cache';
import { formatDateInTimeZone } from '@/lib/utils';
import { syslog } from '@/lib/SystemLogger';

export async function generateTodayDigest() {
    const dateStr = formatDateInTimeZone('Asia/Shanghai');

    try {
        syslog.info('digest', '通过界面手动触发生成今日日报', { date: dateStr });
        const deleted = await prisma.dailyDigest.deleteMany({
            where: { date: dateStr }
        });
        if (deleted.count > 0) {
            syslog.info('digest', `已清理今日旧版数据`, { count: deleted.count, date: dateStr });
        }

        const result = await orchestrator.runDaily();
        syslog.info('digest', `手动触发执行完毕`, { digestId: (result as any)?.digest?.id || '' });
        revalidatePath('/');
        return { success: true, digest: result.digest };
    } catch (err: any) {
        syslog.error('digest', `手动触发执行失败: ${String(err)}`, { error: String(err) });
        return { success: false, error: String(err) };
    }
}
