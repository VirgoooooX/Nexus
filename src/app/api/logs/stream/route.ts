import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    let lastSeenId: string | undefined;

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            // Next.js/Turbopack might buffer the initial response if the payload is too small.
            // Send a 2KB comment to force flush the headers and initial chunks.
            const padding = `:${' '.repeat(2048)}\n\n`;
            controller.enqueue(new TextEncoder().encode(padding));

            // Fetch initial batch from DB
            try {
                const recent = await prisma.systemLog.findMany({
                    orderBy: { createdAt: 'desc' },
                    take: 100,
                });
                const sorted = recent.reverse();
                for (const entry of sorted) {
                    lastSeenId = entry.id;
                    const data = `data: ${JSON.stringify(entry)}\n\n`;
                    controller.enqueue(new TextEncoder().encode(data));
                }
            } catch (err) {
                console.error('[SSE] Failed to load initial logs:', err);
            }

            // Poll the DB every 2 seconds
            const pollInterval = setInterval(async () => {
                try {
                    // Send a ping + 2KB padding to force flush any buffered data in Turbopack/Next.js proxy
                    controller.enqueue(new TextEncoder().encode(`:${' '.repeat(2048)}\n\n`));

                    // Fetch new logs
                    const query: any = {
                        orderBy: [
                            { createdAt: 'asc' },
                            { id: 'asc' }
                        ],
                        take: 50,
                    };

                    if (lastSeenId) {
                        query.cursor = { id: lastSeenId };
                        query.skip = 1;
                    }

                    const newLogs = await prisma.systemLog.findMany(query);

                    for (const entry of newLogs) {
                        lastSeenId = entry.id;
                        const data = `data: ${JSON.stringify(entry)}\n\n`;
                        controller.enqueue(new TextEncoder().encode(data));
                    }
                } catch (err: any) {
                    // If the client disconnected, the controller might be closed
                    if (err?.message?.includes('already closed') || err?.code === 'ERR_INVALID_STATE') {
                        clearInterval(pollInterval);
                    } else {
                        console.error('[SSE] Polling error:', err);
                    }
                }
            }, 2000);

            // Store interval ID on controller for cleanup
            (controller as any)._pollInterval = pollInterval;
        },
        cancel(controller) {
            clearInterval((controller as any)._pollInterval);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
