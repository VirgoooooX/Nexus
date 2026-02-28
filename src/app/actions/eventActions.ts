'use server'

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createEvent(formData: FormData) {
    const name = formData.get('name')?.toString();
    const searchQuery = formData.get('searchQuery')?.toString();

    if (!name || !searchQuery) {
        return { error: 'Name and search query are required.' };
    }

    try {
        const existing = await prisma.trackedEvent.findUnique({
            where: { name }
        });

        if (existing) {
            return { error: 'An event with this name already exists.' };
        }

        const event = await prisma.trackedEvent.create({
            data: {
                name,
                searchQuery,
                status: 'ACTIVE'
            }
        });

        revalidatePath('/');
        return { success: true, eventId: event.id };
    } catch (error: any) {
        return { error: error.message || 'Failed to create event.' };
    }
}

export async function updateEventStatus(eventId: string, status: 'ACTIVE' | 'PAUSED' | 'CONCLUDED') {
    try {
        await prisma.trackedEvent.update({
            where: { id: eventId },
            data: { status }
        });
        revalidatePath(`/events/${eventId}`);
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        return { error: error.message || 'Failed to update event status.' };
    }
}

export async function deleteEvent(eventId: string) {
    try {
        await prisma.trackedEvent.delete({
            where: { id: eventId }
        });
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        return { error: error.message || 'Failed to delete event.' };
    }
}
