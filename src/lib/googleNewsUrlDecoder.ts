type DecodeResult = {
    status: boolean;
    decoded_url?: string;
    message?: string;
};

let decoderPromise: Promise<{ decode: (url: string) => Promise<DecodeResult>; decodeBatch: (urls: string[]) => Promise<DecodeResult[]> }> | null =
    null;

async function getDecoder() {
    if (decoderPromise) return decoderPromise;
    decoderPromise = (async () => {
        const mod: any = await import('google-news-url-decoder');
        const GoogleDecoder = mod?.GoogleDecoder || mod?.default?.GoogleDecoder || mod?.default || mod;
        const decoder = new GoogleDecoder();
        return decoder as { decode: (url: string) => Promise<DecodeResult>; decodeBatch: (urls: string[]) => Promise<DecodeResult[]> };
    })();
    return decoderPromise;
}

function looksLikeGoogleNewsUrl(url: string): boolean {
    try {
        const u = new URL(url);
        if (u.hostname !== 'news.google.com') return false;
        return u.pathname.includes('/rss/articles/') || u.pathname.includes('/articles/') || u.pathname.includes('/read/');
    } catch {
        return false;
    }
}

export async function decodeGoogleNewsUrl(url: string): Promise<string | null> {
    if (!looksLikeGoogleNewsUrl(url)) return null;
    try {
        const decoder = await getDecoder();
        const res = await decoder.decode(url);
        if (res && res.status && typeof res.decoded_url === 'string' && res.decoded_url.trim()) {
            return res.decoded_url.trim();
        }
        return null;
    } catch {
        return null;
    }
}

export async function decodeGoogleNewsUrls(urls: string[]): Promise<Map<string, string>> {
    const list = Array.isArray(urls) ? urls.filter((u) => typeof u === 'string' && looksLikeGoogleNewsUrl(u)) : [];
    if (list.length === 0) return new Map();

    const unique: string[] = [];
    const seen = new Set<string>();
    for (const u of list) {
        if (seen.has(u)) continue;
        seen.add(u);
        unique.push(u);
    }

    try {
        const decoder = await getDecoder();
        const results = await decoder.decodeBatch(unique);
        const out = new Map<string, string>();
        for (let i = 0; i < unique.length; i++) {
            const r = results?.[i];
            const decoded = r && r.status && typeof r.decoded_url === 'string' ? r.decoded_url.trim() : '';
            if (decoded) out.set(unique[i], decoded);
        }
        return out;
    } catch {
        const out = new Map<string, string>();
        for (const u of unique) {
            const decoded = await decodeGoogleNewsUrl(u);
            if (decoded) out.set(u, decoded);
        }
        return out;
    }
}

