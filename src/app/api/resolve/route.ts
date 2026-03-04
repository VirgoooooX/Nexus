import { NextRequest, NextResponse } from 'next/server';
import { looksLikeGoogleNewsUrl, resolveGoogleNewsUrl } from '@/lib/googleNewsResolve';

export async function GET(req: NextRequest) {
    const urlParam = req.nextUrl.searchParams.get('url') || '';
    if (!urlParam) {
        return NextResponse.json({ ok: false, error: 'missing_url' }, { status: 400 });
    }
    if (!looksLikeGoogleNewsUrl(urlParam)) {
        return NextResponse.json({ ok: false, error: 'not_google_news' }, { status: 400 });
    }

    const resolved = await resolveGoogleNewsUrl(urlParam);
    return NextResponse.redirect(resolved || urlParam, 302);
}
