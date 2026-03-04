import Link from 'next/link';
import { prisma } from '@/lib/db';

export const revalidate = 0;

export default async function DigestsPage() {
    const digests = await prisma.dailyDigest.findMany({
        orderBy: { date: 'desc' },
        select: { date: true, createdAt: true },
        take: 365,
    });

    return (
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-10 sm:py-14">
            <div className="flex items-end justify-between gap-6 mb-10">
                <div className="space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-stone-500">
                        Digest Archive
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
                        历史日报
                    </h1>
                    <p className="text-sm text-stone-600 leading-relaxed max-w-2xl">
                        查看已生成并落库的日报。未生成的日期不会自动补生成。
                    </p>
                </div>
                <Link
                    href="/"
                    className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-900 hover:text-indigo-600 transition-colors"
                >
                    返回今日
                </Link>
            </div>

            {digests.length === 0 ? (
                <div className="rounded-2xl border border-stone-200 bg-white p-10 text-stone-600">
                    未生成/无数据
                </div>
            ) : (
                <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
                    <div className="px-6 py-4 border-b border-stone-100 text-[10px] font-black uppercase tracking-[0.28em] text-stone-500 flex justify-between">
                        <span>日期</span>
                        <span>创建时间</span>
                    </div>
                    <div className="divide-y divide-stone-100">
                        {digests.map((d) => (
                            <Link
                                key={d.date}
                                href={`/digests/${encodeURIComponent(d.date)}`}
                                className="grid grid-cols-[1fr_auto] items-center gap-6 px-6 py-4 hover:bg-stone-50 transition-colors"
                            >
                                <div className="text-sm font-semibold text-stone-900 tabular-nums">
                                    {d.date}
                                </div>
                                <div className="text-[11px] font-bold text-stone-500 tabular-nums whitespace-nowrap">
                                    {new Date(d.createdAt).toISOString().slice(0, 19).replace('T', ' ')}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
