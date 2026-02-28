'use client';

import Link from 'next/link';
import { Clock, ChevronRight } from 'lucide-react';

interface EventCardProps {
    event: {
        id: string;
        name: string;
        status: string;
        globalSummary: string | null;
        lastCheckedAt: string | Date;
        _count: { nodes: number };
    };
}

const statusMap: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: '追踪中', color: 'bg-emerald-500' },
    PAUSED: { label: '已暂停', color: 'bg-amber-500' },
    CONCLUDED: { label: '已结束', color: 'bg-stone-400' },
};

export function EventCard({ event }: EventCardProps) {
    const status = statusMap[event.status] || statusMap.ACTIVE;
    const lastChecked = new Date(event.lastCheckedAt).toLocaleDateString('zh-CN');

    return (
        <Link href={`/events/${event.id}`} className="block group">
            <article className="h-full p-5 bg-white border border-stone-200 rounded-lg hover:border-stone-400 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-serif font-bold text-stone-900 text-base leading-snug group-hover:text-stone-600 transition-colors line-clamp-2">
                        {event.name}
                    </h3>
                    <span className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                        {status.label}
                    </span>
                </div>

                <p className="text-stone-500 text-sm leading-relaxed line-clamp-2 mb-4">
                    {event.globalSummary || '尚未积累更新。AI 将随着追踪进展为您梳理脉络。'}
                </p>

                <div className="flex items-center justify-between text-xs text-stone-400">
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {lastChecked} · {event._count.nodes} 个节点
                    </span>
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors" />
                </div>
            </article>
        </Link>
    );
}
