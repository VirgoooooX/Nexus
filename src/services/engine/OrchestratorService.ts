import { dailyDigestEngine } from './DailyDigestEngine';
import { prisma } from '@/lib/db';
import { formatDateInTimeZone } from '@/lib/utils';
import { syslog } from '@/lib/SystemLogger';

function normalizeUrl(raw: string): string {
    try {
        const u = new URL(raw.trim());
        u.hash = '';
        return u.toString().replace(/\/$/, '');
    } catch {
        return raw.trim();
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

type RelatedTracker = {
    id: string;
    name: string;
    lastNodeDate?: string;
    lastNodeHeadline?: string;
    reason: 'source_url_match';
};

function buildDigestTrackedUpdateNodeText(update: any) {
    const highlights = Array.isArray(update?.highlights) ? update.highlights : [];
    const lines: string[] = [];
    const sources: string[] = [];
    for (const h of highlights) {
        if (typeof h !== 'object' || h === null) continue;
        const headline = typeof h.headline === 'string' ? h.headline : '';
        if (!headline) continue;
        const summary = typeof h.summary === 'string' ? h.summary : '';
        const citations = Array.isArray(h.citations) ? h.citations : [];
        const refs: string[] = [];
        for (const c of citations) {
            if (typeof c !== 'object' || c === null) continue;
            const url = typeof (c as any).url === 'string' ? (c as any).url : '';
            const source = typeof (c as any).source === 'string' ? (c as any).source : '';
            if (!url) continue;
            sources.push(url);
            refs.push(source || '来源');
        }
        const refText = refs.length > 0 ? `（${Array.from(new Set(refs)).join(', ')}）` : '';
        lines.push(`- ${headline}${summary ? `：${summary}` : ''}${refText}`);
    }
    const headline = lines.length > 0 ? String(lines[0]).replace(/^- /, '').split('：')[0].trim() : '';
    return { headline: headline || (typeof update?.eventName === 'string' ? update.eventName : ''), content: lines.join('\n'), sources: Array.from(new Set(sources.map(normalizeUrl).filter(Boolean))) };
}

async function writeTrackedUpdatesAsEventNodes(dateStr: string, digestRawJson: string | null | undefined) {
    if (!digestRawJson) return { created: 0, skipped: 0 };
    let parsed: unknown;
    try {
        parsed = JSON.parse(digestRawJson);
    } catch {
        return { created: 0, skipped: 0 };
    }
    if (!isRecord(parsed)) return { created: 0, skipped: 0 };
    const trackedUpdates = Array.isArray((parsed as any).trackedUpdates) ? (parsed as any).trackedUpdates : [];
    if (trackedUpdates.length === 0) return { created: 0, skipped: 0 };

    let created = 0;
    let skipped = 0;
    for (const u of trackedUpdates) {
        if (typeof u !== 'object' || u === null) continue;
        const eventId = typeof (u as any).eventId === 'string' ? (u as any).eventId : '';
        if (!eventId) continue;
        const node = buildDigestTrackedUpdateNodeText(u);
        if (!node.headline || node.sources.length === 0) continue;
        const exists = await prisma.eventNode.findFirst({ where: { eventId, date: dateStr, headline: node.headline }, select: { id: true } });
        if (exists) {
            skipped += 1;
            continue;
        }
        await prisma.eventNode.create({
            data: {
                eventId,
                date: dateStr,
                headline: node.headline,
                content: node.content,
                sources: JSON.stringify(node.sources)
            }
        });
        created += 1;
    }
    return { created, skipped };
}

async function attachRelatedTrackersToDigest(dateStr: string) {
    const digest = await prisma.dailyDigest.findUnique({ where: { date: dateStr } });
    if (!digest?.rawJson) return;

    let parsed: unknown;
    try {
        parsed = JSON.parse(digest.rawJson);
    } catch {
        return;
    }

    const categories =
        isRecord(parsed) && Array.isArray(parsed.categories) ? (parsed.categories as unknown[]) : [];
    const itemRefs: Array<{ item: Record<string, unknown>; urls: string[] }> = [];

    const pushItemRef = (item: Record<string, unknown>) => {
        const rawUrls: string[] = [];
        const url = typeof item.url === 'string' ? item.url : '';
        if (url) rawUrls.push(url);
        const citations = Array.isArray(item.citations) ? item.citations : [];
        for (const c of citations) {
            if (typeof c !== 'object' || c === null) continue;
            const u = typeof (c as any).url === 'string' ? (c as any).url : '';
            if (!u.trim()) continue;
            rawUrls.push(u);
        }
        const evidenceUrls = Array.isArray(item.evidenceUrls) ? item.evidenceUrls : [];
        for (const u of evidenceUrls) {
            if (typeof u !== 'string') continue;
            if (!u.trim()) continue;
            rawUrls.push(u);
        }
        const urls = Array.from(new Set(rawUrls.map(normalizeUrl).filter((x) => x)));
        if (urls.length === 0) return;
        itemRefs.push({ item, urls });
    };

    for (const cat of categories) {
        const themes = isRecord(cat) && Array.isArray(cat.themes) ? (cat.themes as unknown[]) : [];
        for (const theme of themes) {
            const items = isRecord(theme) && Array.isArray(theme.items) ? (theme.items as unknown[]) : [];
            for (const item of items) {
                if (!isRecord(item)) continue;
                pushItemRef(item);
            }
        }

        const fallbackItems = isRecord(cat) && Array.isArray(cat.items) ? (cat.items as unknown[]) : [];
        for (const item of fallbackItems) {
            if (!isRecord(item)) continue;
            pushItemRef(item);
        }
    }

    const legacyTopItems = isRecord(parsed) && Array.isArray(parsed.items) ? (parsed.items as unknown[]) : [];
    for (const item of legacyTopItems) {
        if (!isRecord(item)) continue;
        pushItemRef(item);
    }

    if (itemRefs.length === 0) return;

    const activeEvents = await prisma.trackedEvent.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true } });
    if (activeEvents.length === 0) return;

    const eventNameById = new Map(activeEvents.map((e) => [e.id, e.name]));
    const activeIds = activeEvents.map((e) => e.id);

    const windowStart = new Date(dateStr);
    windowStart.setDate(windowStart.getDate() - 30);
    const windowStartStr = windowStart.toISOString().split('T')[0];

    const nodes = await prisma.eventNode.findMany({
        where: { eventId: { in: activeIds }, date: { gte: windowStartStr } },
        select: { eventId: true, date: true, headline: true, sources: true }
    });

    const latestNodeByEvent = new Map<string, { date: string; headline: string }>();
    const urlToEventIds = new Map<string, Set<string>>();

    for (const n of nodes) {
        const prev = latestNodeByEvent.get(n.eventId);
        if (!prev || n.date > prev.date) {
            latestNodeByEvent.set(n.eventId, { date: n.date, headline: n.headline });
        }

        let sources: unknown = [];
        try {
            sources = JSON.parse(n.sources);
        } catch { }
        if (!Array.isArray(sources)) continue;
        for (const s of sources) {
            if (typeof s !== 'string') continue;
            const key = normalizeUrl(s);
            if (!key) continue;
            const set = urlToEventIds.get(key) || new Set<string>();
            set.add(n.eventId);
            urlToEventIds.set(key, set);
        }
    }

    for (const { item, urls } of itemRefs) {
        const matchedEventIds = new Set<string>();
        for (const url of urls) {
            const matched = urlToEventIds.get(url);
            if (!matched) continue;
            for (const id of matched) matchedEventIds.add(id);
        }
        const trackers: RelatedTracker[] = [];
        for (const eventId of matchedEventIds) {
            const name = eventNameById.get(eventId);
            if (!name) continue;
            const latest = latestNodeByEvent.get(eventId);
            trackers.push({
                id: eventId,
                name,
                lastNodeDate: latest?.date,
                lastNodeHeadline: latest?.headline,
                reason: 'source_url_match'
            });
        }
        item['relatedTrackers'] = trackers;
    }

    await prisma.dailyDigest.update({ where: { id: digest.id }, data: { rawJson: JSON.stringify(parsed) } });
}

export class OrchestratorService {
    async runDaily() {
        syslog.info('orchestrator', '开始执行每日编排任务');
        const dateStr = formatDateInTimeZone('Asia/Shanghai');
        syslog.info('orchestrator', `日期：${dateStr}`);

        // 1. Daily Digest
        let digestResult = null;
        try {
            digestResult = await dailyDigestEngine.runDailyDigest(dateStr);
            syslog.info('orchestrator', `日报生成完成`, { digestId: (digestResult as any)?.id || '' });
        } catch (err) {
            syslog.error('orchestrator', `日报生成失败: ${String(err)}`, { error: String(err) });
        }

        let trackingResults = null;
        try {
            trackingResults = digestResult ? await writeTrackedUpdatesAsEventNodes(dateStr, (digestResult as any).rawJson) : null;
            if (trackingResults) syslog.info('orchestrator', `追踪事件节点写入完成`, { created: (trackingResults as any).created || 0, skipped: (trackingResults as any).skipped || 0 });
        } catch (err) {
            syslog.error('orchestrator', `追踪事件节点写入失败: ${String(err)}`, { error: String(err) });
        }

        try {
            await attachRelatedTrackersToDigest(dateStr);
            syslog.info('orchestrator', `相关追踪器已关联至日报`, { date: dateStr });
        } catch (err) {
            syslog.error('orchestrator', `追踪器关联失败: ${String(err)}`, { error: String(err) });
        }

        syslog.info('orchestrator', '每日编排任务完成');

        return {
            date: dateStr,
            digest: digestResult,
            tracking: trackingResults
        };
    }
}

export const orchestrator = new OrchestratorService();
