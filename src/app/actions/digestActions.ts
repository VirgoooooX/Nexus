'use server';

import { prisma } from '@/lib/db';
import { orchestrator } from '@/services/engine/OrchestratorService';
import { revalidatePath } from 'next/cache';
import { formatDateInTimeZone } from '@/lib/utils';

export async function generateTodayDigest() {
    const dateStr = formatDateInTimeZone('Asia/Shanghai');

    try {
        console.log(`[digestActions] generateTodayDigest start date=${dateStr}`);
        // Delete existing digest for today so we can regenerate with new format
        const deleted = await prisma.dailyDigest.deleteMany({
            where: { date: dateStr }
        });
        console.log(`[digestActions] generateTodayDigest deleted count=${deleted.count} date=${dateStr}`);

        const result = await orchestrator.runDaily();
        console.log(`[digestActions] generateTodayDigest done date=${dateStr} digestId=${(result as any)?.digest?.id || ''}`);
        revalidatePath('/');
        return { success: true, digest: result.digest };
    } catch (err: any) {
        console.error('[digestActions] Failed to generate digest:', err);
        return { success: false, error: String(err) };
    }
}
