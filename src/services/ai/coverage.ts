export function normalizeCoveredUrls(
    raw: unknown,
    isAllowed: (url: string) => boolean,
    opts?: { seedUrls?: unknown; max?: number }
) {
    const max = typeof opts?.max === 'number' && opts.max > 0 ? Math.floor(opts.max) : 200;
    const out: string[] = [];
    const seen = new Set<string>();

    const push = (u: unknown) => {
        const s = typeof u === 'string' ? u.trim() : '';
        if (!s) return;
        if (!isAllowed(s)) return;
        if (seen.has(s)) return;
        seen.add(s);
        out.push(s);
    };

    const list = Array.isArray(raw) ? raw : [];
    for (const u of list) {
        push(u);
        if (out.length >= max) break;
    }

    const seedList = Array.isArray(opts?.seedUrls) ? opts?.seedUrls : [];
    for (const u of seedList) {
        push(u);
        if (out.length >= max) break;
    }

    return out.length ? out : undefined;
}
