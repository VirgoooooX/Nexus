export function normalizeUrlString(raw: string): string {
    let s = String(raw || '').trim();
    if (!s) return '';

    if ((s.startsWith('`') && s.endsWith('`')) || (s.startsWith('“') && s.endsWith('”')) || (s.startsWith('‘') && s.endsWith('’'))) {
        s = s.slice(1, -1).trim();
    }
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
    }
    if (s.startsWith('`') && s.endsWith('`')) {
        s = s.slice(1, -1).trim();
    }
    return s;
}

