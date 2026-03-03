import { cleanOne, parseCleanRequest } from '@/lib/cleanServer';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body: unknown = await request.json().catch(() => null);
        const input = parseCleanRequest(body);
        if (!input) return Response.json({ ok: false, error: 'invalid_request' }, { status: 400 });
        const result = await cleanOne(input);
        return Response.json({ ok: true, result });
    } catch (err: any) {
        return Response.json({ ok: false, error: String(err) }, { status: 500 });
    }
}

