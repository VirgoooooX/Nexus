// REST endpoint for paginated system log queries
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 50));
    const source = searchParams.get('source') || undefined;
    const level = searchParams.get('level') || undefined;

    const where: Record<string, unknown> = {};
    if (source) where.source = source;
    if (level) where.level = level;

    const [logs, total] = await Promise.all([
        prisma.systemLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.systemLog.count({ where }),
    ]);

    return Response.json({
        logs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    });
}

// DELETE endpoint to clear logs
export async function DELETE() {
    const { count } = await prisma.systemLog.deleteMany();
    return Response.json({ success: true, deleted: count });
}
