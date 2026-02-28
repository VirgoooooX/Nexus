'use server';

import { prisma } from '@/lib/db';
import { orchestrator } from '@/services/engine/OrchestratorService';
import { revalidatePath } from 'next/cache';

export async function generateTodayDigest() {
    const dateStr = new Date().toISOString().split('T')[0];

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
