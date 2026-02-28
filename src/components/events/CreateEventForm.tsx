'use client'

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createEvent } from '@/app/actions/eventActions';
import { AlertCircle } from 'lucide-react';

export function CreateEventForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState('');

    const defaultName = searchParams.get('name') || '';
    const defaultQuery = searchParams.get('query') || '';

    async function onSubmit(formData: FormData) {
        setIsPending(true);
        setError('');

        const result = await createEvent(formData);

        if (result.error) {
            setError(result.error);
            setIsPending(false);
        } else if (result.success) {
            router.push(`/events/${result.eventId}`);
        }
    }

    return (
        <form action={onSubmit}>
            <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-stone-100">
                    <h2 className="font-serif text-2xl font-bold text-stone-900 mb-1">
                        新建事件追踪
                    </h2>
                    <p className="text-sm text-stone-500">
                        部署 AI 智能体，持续监控并整合特定事件的长期脉络。
                    </p>
                </div>

                <div className="p-6 sm:p-8 space-y-6">

                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="name" className="block text-sm font-bold text-stone-700">
                            事件名称
                        </label>
                        <input
                            id="name"
                            name="name"
                            defaultValue={defaultName}
                            placeholder="例如：LK-99 室温超导…"
                            required
                            className="w-full h-11 px-4 border border-stone-200 rounded-lg bg-stone-50 text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-all"
                        />
                        <p className="text-xs text-stone-400">为该事件时间线起一个清晰易记的名称。</p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="searchQuery" className="block text-sm font-bold text-stone-700">
                            AI 搜索指令
                        </label>
                        <textarea
                            id="searchQuery"
                            name="searchQuery"
                            defaultValue={defaultQuery}
                            placeholder="例如：搜索近期有关 LK-99 的最新实验复现结果…"
                            required
                            rows={4}
                            className="w-full px-4 py-3 border border-stone-200 rounded-lg bg-stone-50 text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-all resize-none leading-relaxed"
                        />
                        <p className="text-xs text-stone-400">用于指导 AI 每日网络搜索的精确提示词。</p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 sm:p-8 bg-stone-50 border-t border-stone-100">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        disabled={isPending}
                        className="px-4 py-2 text-sm font-bold text-stone-500 hover:text-stone-700 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="px-5 py-2.5 text-sm font-bold bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50"
                    >
                        {isPending ? '创建中…' : '创建追踪器'}
                    </button>
                </div>
            </div>
        </form>
    );
}
