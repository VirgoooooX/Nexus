import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { TimelineView } from '@/components/timeline/TimelineView';
import { ArrowLeft, Play, Pause, Trash2, Clock, GitBranch } from 'lucide-react';
import Link from 'next/link';

import { updateEventStatus, deleteEvent } from '@/app/actions/eventActions';

export const revalidate = 0;

const statusMap: Record<string, { label: string; dot: string }> = {
    ACTIVE: { label: '追踪中', dot: 'bg-emerald-500' },
    PAUSED: { label: '已暂停', dot: 'bg-amber-500' },
    CONCLUDED: { label: '已结束', dot: 'bg-stone-400' },
};

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const event = await prisma.trackedEvent.findUnique({
        where: { id },
        include: {
            nodes: {
                orderBy: { date: 'desc' }
            }
        }
    });

    if (!event) {
        notFound();
    }

    const isPaused = event.status === 'PAUSED';
    const isConcluded = event.status === 'CONCLUDED';
    const status = statusMap[event.status] || statusMap.ACTIVE;

    return (
        <div className="min-h-screen bg-stone-50 text-stone-900">

            {/* Sub-nav */}
            <div className="sticky top-12 z-40 bg-white border-b border-stone-200">
                <div className="max-w-4xl mx-auto px-5 sm:px-8 h-12 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/events"
                            className="text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1.5"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> 返回
                        </Link>
                        <span className="w-px h-4 bg-stone-200" />
                        <span className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wider">
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <form action={async () => {
                            "use server";
                            await updateEventStatus(event.id, isPaused ? 'ACTIVE' : 'PAUSED');
                        }}>
                            <button type="submit" className="text-xs font-bold text-stone-500 hover:text-stone-900 border border-stone-200 hover:border-stone-400 px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5">
                                {isPaused ? <><Play className="w-3 h-3" /> 恢复</> : <><Pause className="w-3 h-3" /> 暂停</>}
                            </button>
                        </form>

                        <form action={async () => {
                            "use server";
                            await updateEventStatus(event.id, 'CONCLUDED');
                        }}>
                            <button type="submit" disabled={isConcluded} className="text-xs font-bold text-stone-500 hover:text-stone-900 border border-stone-200 hover:border-stone-400 px-3 py-1.5 rounded-md transition-all disabled:opacity-40">
                                结束
                            </button>
                        </form>

                        <form action={async () => {
                            "use server";
                            await deleteEvent(event.id);
                        }}>
                            <button type="submit" className="text-xs font-bold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5">
                                <Trash2 className="w-3 h-3" /> 删除
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-5 sm:px-8 pt-10 pb-24 space-y-10">
                {/* Header */}
                <header className="border-b-2 border-stone-900 pb-6">
                    <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-tight text-stone-900 mb-3">
                        {event.name}
                    </h1>
                    <div className="flex items-center gap-4 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                            <GitBranch className="w-3.5 h-3.5" />
                            {event.nodes.length} 个时间线节点
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            最后更新：{new Date(event.lastCheckedAt).toLocaleDateString('zh-CN')}
                        </span>
                    </div>
                </header>

                {/* Global Summary */}
                <section className="border-l-4 border-stone-800 pl-5 py-2">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500 mb-3">
                        全局脉络综述
                    </h3>
                    <p className="text-stone-700 text-[15px] leading-[1.9] font-serif">
                        {event.globalSummary || "时间线尚处空白。等待 AI 引擎将节点编织成连贯的叙事脉络。"}
                    </p>
                </section>

                {/* Timeline */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px bg-stone-200 flex-1" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">
                            时间线
                        </span>
                        <div className="h-px bg-stone-200 flex-1" />
                    </div>
                    <TimelineView nodes={event.nodes} />
                </section>
            </main>

        </div>
    );
}
