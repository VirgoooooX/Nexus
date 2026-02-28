import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const events = await prisma.trackedEvent.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: { nodes: true }
                }
            }
        });

        return Response.json({ success: true, events });
    } catch (err: any) {
        return Response.json({ success: false, error: String(err) }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, searchQuery } = body;

        if (!name || !searchQuery) {
            return Response.json({ error: 'name and searchQuery are required' }, { status: 400 });
        }

        const event = await prisma.trackedEvent.create({
            data: {
                name,
                searchQuery,
                status: 'ACTIVE'
            }
        });

        return Response.json({ success: true, event });
    } catch (err: any) {
        return Response.json({ success: false, error: String(err) }, { status: 500 });
    }
}
