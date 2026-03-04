import Link from 'next/link';
import { prisma } from '@/lib/db';
import LayoutWrapper from '@/components/dashboard/LayoutWrapper';
import { getSettings } from '@/app/actions/settingsActions';

export const revalidate = 0;

function looksLikeDate(s: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function DigestByDatePage({ params }: { params: { date: string } }) {
    const { date } = params;
    if (!looksLikeDate(date)) {
        return (
            <div className="max-w-4xl mx-auto px-6 sm:px-10 py-10 sm:py-14">
                <div className="rounded-2xl border border-stone-200 bg-white p-10 text-stone-600">
                    未生成/无数据
                </div>
                <div className="mt-6">
                    <Link href="/digests" className="text-sm font-semibold text-stone-900 hover:text-indigo-600 transition-colors">
                        返回历史日报
                    </Link>
                </div>
            </div>
        );
    }

    const digest = await prisma.dailyDigest.findUnique({
        where: { date },
    });

    if (!digest?.rawJson) {
        return (
            <div className="max-w-4xl mx-auto px-6 sm:px-10 py-10 sm:py-14">
                <div className="flex items-center justify-between mb-6">
                    <div className="text-sm font-semibold text-stone-900 tabular-nums">
                        {date}
                    </div>
                    <Link href="/digests" className="text-sm font-semibold text-stone-900 hover:text-indigo-600 transition-colors">
                        返回历史日报
                    </Link>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-10 text-stone-600">
                    未生成/无数据
                </div>
            </div>
        );
    }

    let categories: any[] = [];
    let overallSummary = '';
    let recommendedEvents: any[] = [];
    let trackedUpdates: any[] = [];

    try {
        const parsed = JSON.parse(digest.rawJson);
        categories = parsed.categories || [];
        overallSummary = parsed.overallSummary || '';
        recommendedEvents = parsed.recommendedEvents || [];
        trackedUpdates = parsed.trackedUpdates || [];

        if (categories.length === 0 && parsed.items?.length > 0) {
            categories = [{ name: '科技热点', icon: 'cpu', items: parsed.items }];
        }
    } catch { }

    let totalItems = 0;
    categories.forEach((cat: any) => {
        if (cat.themes) {
            cat.themes.forEach((theme: any) => totalItems += theme.items ? theme.items.length : 0);
        } else if (cat.items) {
            totalItems += cat.items.length;
        }
    });

    const { defaultLayout } = await getSettings();

    return (
        <LayoutWrapper
            today={date}
            categories={categories}
            overallSummary={overallSummary}
            totalItems={totalItems}
            recommendedEvents={recommendedEvents}
            trackedUpdates={trackedUpdates}
            hasData={categories.length > 0}
            activeView={defaultLayout}
        />
    );
}
