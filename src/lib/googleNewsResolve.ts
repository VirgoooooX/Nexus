import { decodeGoogleNewsUrl } from '@/lib/googleNewsUrlDecoder';

export function looksLikeGoogleNewsUrl(urlStr: string) {
    try {
        const u = new URL(urlStr);
        if (u.hostname !== 'news.google.com') return false;
        if (!u.pathname.includes('/rss/articles/') && !u.pathname.includes('/articles/') && !u.pathname.includes('/read/')) return false;
        return true;
    } catch {
        return false;
    }
}

export async function resolveGoogleNewsUrl(urlStr: string, deps?: { decode?: (url: string) => Promise<string | null> }) {
    if (!looksLikeGoogleNewsUrl(urlStr)) return null;
    const decode = deps?.decode ?? decodeGoogleNewsUrl;
    const out = await decode(urlStr);
    if (!out) return null;
    try {
        const u = new URL(out);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
        return u.toString();
    } catch {
        return null;
    }
}
