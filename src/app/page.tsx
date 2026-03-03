import { prisma } from '@/lib/db';
import { getSettings } from '@/app/actions/settingsActions';
import LayoutWrapper from '@/components/dashboard/LayoutWrapper';
import { formatDateInTimeZone } from '@/lib/utils';

export const revalidate = 0;

export default async function HomePage() {
  const todayUtc = new Date().toISOString().split('T')[0];
  const today = formatDateInTimeZone('Asia/Shanghai');

  console.log(`[HomePage] todayUtc=${todayUtc} todayShanghai=${today}`);

  const digest = await prisma.dailyDigest.findUnique({
    where: { date: today }
  });
  console.log(`[HomePage] digestLookup date=${today} found=${Boolean(digest)} id=${digest?.id || ''} rawJsonLen=${digest?.rawJson?.length || 0} contentLen=${digest?.content?.length || 0}`);

  let categories = [];
  let overallSummary = '';
  let recommendedEvents = [];
  let trackedUpdates = [];

  if (digest?.rawJson) {
    try {
      const parsed = JSON.parse(digest.rawJson);
      categories = parsed.categories || [];
      overallSummary = parsed.overallSummary || '';
      recommendedEvents = parsed.recommendedEvents || [];
      trackedUpdates = parsed.trackedUpdates || [];

      // Backward compatibility: if old flat format, wrap in single category
      if (categories.length === 0 && parsed.items?.length > 0) {
        categories = [{ name: '科技热点', icon: 'cpu', items: parsed.items }];
      }
      console.log(`[HomePage] rawJsonParsed ok=true categories=${categories.length} overallSummaryLen=${overallSummary.length} recommendedEvents=${recommendedEvents.length} trackedUpdates=${trackedUpdates.length}`);
    } catch (e: any) {
      console.error(`[HomePage] rawJsonParsed ok=false err=${String(e)}`);
    }
  }

  // Fetch custom category order and sort
  // Fetch custom category order and sort
  const { categoriesOrder, defaultLayout } = await getSettings();
  categories.sort((a: any, b: any) => {
    const idxA = categoriesOrder.indexOf(a.name);
    const idxB = categoriesOrder.indexOf(b.name);
    const rankA = idxA === -1 ? 999 : idxA;
    const rankB = idxB === -1 ? 999 : idxB;
    return rankA - rankB;
  });

  // Calculate total items
  let totalItems = 0;
  categories.forEach((cat: any) => {
    if (cat.themes) {
      cat.themes.forEach((theme: any) => totalItems += theme.items ? theme.items.length : 0);
    } else if (cat.items) {
      totalItems += cat.items.length;
    }
  });

  const hasData = categories.length > 0;
  console.log(`[HomePage] render today=${today} hasData=${hasData} totalItems=${totalItems}`);

  return (
    <>
      <LayoutWrapper
        today={today}
        categories={categories}
        overallSummary={overallSummary}
        totalItems={totalItems}
        recommendedEvents={recommendedEvents}
        trackedUpdates={trackedUpdates}
        hasData={hasData}
        activeView={defaultLayout}
      />

    </>
  );
}
