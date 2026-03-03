'use client';

import { useState } from 'react';
import { Zap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { generateTodayDigest } from '@/app/actions/digestActions';

export function GenerateDigestButton() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    async function handleClick() {
        setStatus('loading');
        setErrorMsg('');

        try {
            console.log('[GenerateDigestButton] generateTodayDigest start');
            const result = await generateTodayDigest();

            if (result.success) {
                console.log('[GenerateDigestButton] generateTodayDigest success');
                setStatus('success');
                setTimeout(() => {
                    setStatus('idle');
                    window.location.reload();
                }, 1500);
            } else {
                console.log('[GenerateDigestButton] generateTodayDigest error', result.error || '');
                setStatus('error');
                setErrorMsg(result.error || '未知错误');
            }
        } catch (err: any) {
            console.log('[GenerateDigestButton] generateTodayDigest exception', String(err));
            setStatus('error');
            setErrorMsg(String(err));
        }
    }

    return (
        <div className="space-y-3">
            <button
                onClick={handleClick}
                disabled={status === 'loading'}
                className={`
                    group relative overflow-hidden transition-all duration-300
                    flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs tracking-wide shadow-sm
                    ${status === 'loading'
                        ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                        : status === 'error'
                            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                            : status === 'success'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : 'bg-stone-900 text-stone-50 hover:bg-stone-800 hover:shadow-md hover:-translate-y-[1px]'
                    }
                `}
            >
                {/* Progress Bar Background for loading State */}
                {status === 'loading' && (
                    <div className="absolute inset-0 bg-stone-300/30 overflow-hidden">
                        <div className="h-full bg-stone-400/20 w-1/2 animate-[shimmer_1.5s_infinite]" />
                    </div>
                )}

                <div className="relative flex items-center justify-center gap-1.5">
                    {status === 'loading' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : status === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : status === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5" />
                    ) : (
                        <Zap className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    )}

                    <span>
                        {status === 'loading'
                            ? '正在扫描...'
                            : status === 'success'
                                ? '生成完毕'
                                : status === 'error'
                                    ? '生成失败'
                                    : '生成今日日报'}
                    </span>
                </div>
            </button>

            {status === 'error' && (
                <div className="absolute top-14 right-4 p-3 w-64 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs leading-relaxed break-all shadow-lg">
                    <AlertCircle className="w-4 h-4 inline mr-1 mb-0.5" />
                    {errorMsg}
                </div>
            )}
        </div>
    );
}
