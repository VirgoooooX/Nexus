import { prisma } from '@/lib/db';
import { aiSearchService } from '../ai/AISearchService';
import { getCleanedArticles } from '@/lib/readflowClient';

export class EventTrackingEngine {

    async evaluateAllTrackers() {
        console.log(`[EventTrackingEngine] Evaluating all active trackers...`);
        const activeEvents = await prisma.trackedEvent.findMany({
            where: { status: 'ACTIVE' }
        });

        console.log(`[EventTrackingEngine] Found ${activeEvents.length} active events.`);
        const results = [];

        for (const event of activeEvents) {
            try {
                const updateResult = await this.evaluateSingleTracker(event.id);
                results.push({ event: event.name, success: true, details: updateResult });
            } catch (err) {
                console.error(`[EventTrackingEngine] Error processing event ${event.name}:`, err);
                results.push({ event: event.name, success: false, error: String(err) });
            }
        }

        return results;
    }

    async evaluateSingleTracker(eventId: string) {
        const event = await prisma.trackedEvent.findUnique({
            where: { id: eventId }
        });

        if (!event) throw new Error(`Event ${eventId} not found`);

        // Format date nicely
        const lastDate = event.lastCheckedAt.toISOString().split('T')[0];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        console.log(`[EventTrackingEngine] Checking updates for [${event.name}] since ${lastDate}`);

        const articles = await getCleanedArticles(lastDate, todayStr);
        const searchResult = await aiSearchService.searchEventUpdateFromArticles(event.name, event.searchQuery, lastDate, articles);

        // 2. No updates -> Just update checked time
        if (!searchResult.hasUpdate || !searchResult.nodes || searchResult.nodes.length === 0) {
            console.log(`[EventTrackingEngine] No new updates for [${event.name}].`);
            await prisma.trackedEvent.update({
                where: { id: event.id },
                data: { lastCheckedAt: today }
            });
            return { updated: false, newNodesCount: 0 };
        }

        console.log(`[EventTrackingEngine] Found ${searchResult.nodes.length} new node(s) for [${event.name}].`);

        // 3. Map Phase: Synthesize new global summary
        const newNodesText = JSON.stringify(searchResult.nodes, null, 2);
        const synthesis = await aiSearchService.synthesizeGlobalSummary(
            event.name,
            event.globalSummary || '',
            newNodesText
        );

        // 4. Save Nodes to DB
        for (const node of searchResult.nodes) {
            await prisma.eventNode.create({
                data: {
                    eventId: event.id,
                    date: node.date || todayStr,
                    headline: node.headline,
                    content: node.content,
                    sources: JSON.stringify(node.sources || [])
                }
            });
        }

        // 5. Update main event
        await prisma.trackedEvent.update({
            where: { id: event.id },
            data: {
                globalSummary: synthesis.updatedSummary,
                lastCheckedAt: today
            }
        });

        console.log(`[EventTrackingEngine] Successfully updated [${event.name}].`);
        return { updated: true, newNodesCount: searchResult.nodes.length, newSummary: synthesis.updatedSummary };
    }
}

export const eventTrackingEngine = new EventTrackingEngine();
