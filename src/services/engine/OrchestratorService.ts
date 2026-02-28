import { dailyDigestEngine } from './DailyDigestEngine';
import { eventTrackingEngine } from './EventTrackingEngine';
import { prisma } from '@/lib/db';

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
    const itemRefs: Array<{ item: Record<string, unknown>; url: string }> = [];
    for (const cat of categories) {
        const themes = isRecord(cat) && Array.isArray(cat.themes) ? (cat.themes as unknown[]) : [];
        for (const theme of themes) {
            const items = isRecord(theme) && Array.isArray(theme.items) ? (theme.items as unknown[]) : [];
            for (const item of items) {
                if (!isRecord(item)) continue;
                const url = typeof item.url === 'string' ? item.url : '';
                if (!url) continue;
                itemRefs.push({ item, url: normalizeUrl(url) });
            }
        }
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

    for (const { item, url } of itemRefs) {
        const matched = urlToEventIds.get(url);
        const trackers: RelatedTracker[] = [];
        if (matched) {
            for (const eventId of matched) {
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
        }
        item['relatedTrackers'] = trackers;
    }

    await prisma.dailyDigest.update({ where: { id: digest.id }, data: { rawJson: JSON.stringify(parsed) } });
}

export class OrchestratorService {
    async runDaily() {
        console.log(`[Orchestrator] Starting daily run...`);
        const dateStr = new Date().toISOString().split('T')[0];

        // 1. Daily Digest
        let digestResult = null;
        try {
            digestResult = await dailyDigestEngine.runDailyDigest(dateStr);
        } catch (err) {
            console.error(`[Orchestrator] Failed to run daily digest:`, err);
        }

        // 2. Track Events
        let trackingResults = null;
        try {
            trackingResults = await eventTrackingEngine.evaluateAllTrackers();
        } catch (err) {
            console.error(`[Orchestrator] Failed to evaluate trackers:`, err);
        }

        try {
            await attachRelatedTrackersToDigest(dateStr);
        } catch (err) {
            console.error(`[Orchestrator] Failed to attach related trackers:`, err);
        }

        console.log(`[Orchestrator] Daily run complete.`);

        return {
            date: dateStr,
            digest: digestResult,
            tracking: trackingResults
        };
    }
}

export const orchestrator = new OrchestratorService();
