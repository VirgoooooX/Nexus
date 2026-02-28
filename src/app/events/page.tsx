import { prisma } from '@/lib/db';
import { EventCard } from '@/components/dashboard/EventCard';
import { Plus, Radio } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

export default async function EventsPage() {
    const trackedEvents = await prisma.trackedEvent.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
            _count: { select: { nodes: true } }
        }
    });

    return (
        <div className="min-h-screen bg-stone-50 text-stone-900">
            <main className="max-w-4xl mx-auto px-5 sm:px-8 pt-10 pb-24">

                {/* Page Header */}
                <header className="flex items-end justify-between border-b-2 border-stone-900 pb-6 mb-10">
                    <div>
                        <p className="text-xs tracking-[0.35em] uppercase text-stone-500 mb-2 font-medium">
                            AI 持续追踪
                        </p>
                        <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
                            事件追踪
                        </h1>
                    </div>
                    <Link
                        href="/events/new"
                        className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-600 hover:text-stone-900 border border-stone-300 hover:border-stone-900 px-4 py-2 rounded-lg transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        新建追踪
                    </Link>
                </header>

                {/* Events Grid */}
                {trackedEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {trackedEvents.map((event: any) => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-stone-100 flex items-center justify-center">
                            <Radio className="w-7 h-7 text-stone-300" />
                        </div>
                        <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto mb-6">
                            当前没有正在追踪的事件。<br />
                            创建一个追踪器，AI 将持续为您监测进展。
                        </p>
                        <Link
                            href="/events/new"
                            className="inline-flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-stone-900 border border-stone-300 hover:border-stone-900 px-5 py-2.5 rounded-lg transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            创建第一个追踪器
                        </Link>
                    </div>
                )}

            </main>
        </div>
    );
}
