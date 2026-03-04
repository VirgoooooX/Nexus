export function selectTimelineNodes<T>(
    nodes: T[],
    opts?: {
        expanded?: boolean;
        defaultCount?: number;
    }
) {
    const expanded = Boolean(opts?.expanded);
    const defaultCount = typeof opts?.defaultCount === 'number' && opts.defaultCount > 0 ? Math.floor(opts.defaultCount) : 5;
    if (expanded) return nodes;
    return nodes.slice(0, defaultCount);
}
