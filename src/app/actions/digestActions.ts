'use server';

import { prisma } from '@/lib/db';
import { orchestrator } from '@/services/engine/OrchestratorService';
import { revalidatePath } from 'next/cache';
import { formatDateInTimeZone } from '@/lib/utils';

export async function generateTodayDigest() {
    const dateStr = formatDateInTimeZone('Asia/Shanghai');

    try {
        // Delete existing digest for today so we can regenerate with new format
        await prisma.dailyDigest.deleteMany({
            where: { date: dateStr }
        });

        const result = await orchestrator.runDaily();
        revalidatePath('/');
        return { success: true, digest: result.digest };
    } catch (err: any) {
        console.error('[digestActions] Failed to generate digest:', err);
        return { success: false, error: String(err) };
    }
}
