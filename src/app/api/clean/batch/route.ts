import { cleanOne, parseCleanRequest } from '@/lib/cleanServer';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export async function POST(request: Request) {
    try {
        const body: unknown = await request.json().catch(() => null);
        if (!isRecord(body) || !Array.isArray(body.items)) {
            return Response.json({ ok: false, error: 'invalid_request' }, { status: 400 });
        }
        const results: Array<{ inputUrl: string; result?: unknown; error?: string }> = [];
        for (const raw of body.items) {
            const input = parseCleanRequest(raw);
            if (!input) {
                results.push({ inputUrl: '', error: 'invalid_item' });
                continue;
            }
            try {
                const result = await cleanOne(input);
                results.push({ inputUrl: input.url, result });
            } catch (e: unknown) {
                results.push({ inputUrl: input.url, error: String(e) });
            }
        }
        return Response.json({ ok: true, results });
    } catch (err: any) {
        return Response.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
