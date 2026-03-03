function stripMarkdownFences(raw: string): string {
    let s = String(raw || '').trim();
    if (s.startsWith('```json')) s = s.replace(/```json\s*/i, '');
    if (s.startsWith('```')) s = s.replace(/```\s*/i, '');
    s = s.replace(/```$/g, '').trim();
    return s;
}

function isLikelyNonJson(s: string): boolean {
    const t = s.trimStart();
    return t.startsWith('<?xml') || t.startsWith('<xml') || t.startsWith('<rss') || t.startsWith('<!DOCTYPE html') || t.startsWith('<html');
}

function extractFirstJsonSpan(s: string): string | null {
    const str = s.trim();
    const objStart = str.indexOf('{');
    const arrStart = str.indexOf('[');
    if (objStart === -1 && arrStart === -1) return null;
    const start = arrStart === -1 ? objStart : objStart === -1 ? arrStart : Math.min(objStart, arrStart);

    const open = str[start];
    const close = open === '{' ? '}' : ']';

    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < str.length; i++) {
        const ch = str[i];
        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                escaped = true;
                continue;
            }
            if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') {
            inString = true;
            continue;
        }
        if (ch === open) depth += 1;
        else if (ch === close) depth -= 1;
        if (depth === 0) return str.slice(start, i + 1);
    }
    return null;
}

export function parseJsonLenient<T>(raw: string): T {
    const cleaned = stripMarkdownFences(raw);
    const t = cleaned.trim();
    if (!t) throw new Error('non_json_output: empty');
    if (isLikelyNonJson(t)) {
        throw new Error(`non_json_output: starts_with_xml_or_html: ${t.slice(0, 200)}`);
    }

    try {
        return JSON.parse(t) as T;
    } catch {
        const span = extractFirstJsonSpan(t);
        if (!span) throw new Error(`non_json_output: no_json_span: ${t.slice(0, 200)}`);
        try {
            return JSON.parse(span) as T;
        } catch {
            throw new Error(`non_json_output: invalid_json_span: ${span.slice(0, 200)}`);
        }
    }
}

