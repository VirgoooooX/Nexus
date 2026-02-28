import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;

    try {
        const event = await prisma.trackedEvent.findUnique({
            where: { id },
            include: {
                nodes: {
                    orderBy: { date: 'desc' }
                }
            }
        });

        if (!event) return Response.json({ error: 'Not found' }, { status: 404 });

        return Response.json({ success: true, event });
    } catch (err: any) {
        return Response.json({ success: false, error: String(err) }, { status: 500 });
    }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    try {
        const body = await request.json();
        const { status } = body;

        const event = await prisma.trackedEvent.update({
            where: { id },
            data: { status }
        });

        return Response.json({ success: true, event });
    } catch (err: any) {
        return Response.json({ success: false, error: String(err) }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    try {
        await prisma.trackedEvent.delete({
            where: { id }
        });

        return Response.json({ success: true });
    } catch (err: any) {
        return Response.json({ success: false, error: String(err) }, { status: 500 });
    }
}
