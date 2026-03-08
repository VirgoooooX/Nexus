'use client';

import { useState } from 'react';
import { saveSettings } from '@/app/actions/settingsActions';
import { GripVertical, AlertCircle, Save, CheckCircle2, Play } from 'lucide-react';
import { GenerateDigestButton } from '@/components/dashboard/GenerateDigestButton';
import type { PromptConfig } from '@/lib/promptConfig';

interface SettingsFormProps {
    initialCategories: string[];
    initialPrompt: string;
    initialLayout: string;
    initialReadflowServerUrl: string;
    initialDigestScheduleEnabled: boolean;
    initialDigestScheduleTime: string;
    initialPromptConfig: PromptConfig;
}

const VIEW_OPTIONS = [
    { id: 'masonry', label: 'Masonry', desc: '瀑布流 / 两列分布' },
    { id: 'classic', label: 'Classic', desc: '经典单列 / 简洁清晰' }
];

export function SettingsForm({
    initialCategories,
    initialPrompt,
    initialLayout,
    initialReadflowServerUrl,
    initialDigestScheduleEnabled,
    initialDigestScheduleTime,
    initialPromptConfig,
}: SettingsFormProps) {
    const [categories, setCategories] = useState(initialCategories);
    const [layout, setLayout] = useState(initialLayout);
    const [readflowServerUrl, setReadflowServerUrl] = useState(initialReadflowServerUrl);
    const [digestScheduleEnabled, setDigestScheduleEnabled] = useState(initialDigestScheduleEnabled);
    const [digestScheduleTime, setDigestScheduleTime] = useState(initialDigestScheduleTime);

    const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const moveCategory = (index: number, direction: 'up' | 'down') => {
        const newCategories = [...categories];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex >= 0 && swapIndex < newCategories.length) {
            const temp = newCategories[index];
            newCategories[index] = newCategories[swapIndex];
            newCategories[swapIndex] = temp;
            setCategories(newCategories);
        }
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setStatus('saving');
        setErrorMsg('');
        try {
            const result = await saveSettings(
                categories,
                initialPrompt,
                layout,
                readflowServerUrl,
                digestScheduleEnabled,
                digestScheduleTime,
                initialPromptConfig
            );
            if (result.success) {
                setStatus('success');
                setTimeout(() => setStatus('idle'), 2500);
            } else {
                setStatus('error');
                setErrorMsg(result.error || '保存失败');
            }
        } catch (err: unknown) {
            setStatus('error');
            setErrorMsg(String(err));
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-8 pb-24">

            {/* Status Toast */}
            {status === 'success' && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4" /> 配置已成功保存
                </div>
            )}
            {status === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                    <AlertCircle className="w-4 h-4" /> {errorMsg}
                </div>
            )}

            {/* ═══════════ 首页排版 ═══════════ */}
            <section className="space-y-3">
                <h2 className="font-serif text-lg font-bold text-stone-900">首页排版</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {VIEW_OPTIONS.map(view => (
                        <button
                            key={view.id}
                            type="button"
                            onClick={() => setLayout(view.id)}
                            className={`text-left px-5 py-4 rounded-lg border transition-all ${layout === view.id
                                ? 'border-stone-900 bg-white shadow-sm ring-1 ring-stone-900'
                                : 'border-stone-200 bg-white hover:border-stone-300'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${layout === view.id ? 'bg-stone-900' : 'bg-stone-200'}`} />
                                <div>
                                    <div className="font-bold text-stone-900">{view.label}</div>
                                    <div className="text-xs text-stone-500 mt-0.5">{view.desc}</div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* ═══════════ 板块排序 ═══════════ */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="font-serif text-lg font-bold text-stone-900">板块排序</h2>
                    <span className="text-xs text-stone-400">{categories.length} 个板块</span>
                </div>
                <div className="border border-stone-200 rounded-lg overflow-hidden bg-white divide-y divide-stone-100">
                    {categories.map((cat, idx) => (
                        <div key={cat} className="flex items-center gap-4 px-4 py-3 hover:bg-stone-50 transition-colors group">
                            <GripVertical className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors" />
                            <span className="font-bold text-sm text-stone-900 flex-1">{cat}</span>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => moveCategory(idx, 'up')} disabled={idx === 0}
                                    className="text-xs font-medium text-stone-400 hover:text-stone-900 px-2.5 py-1 rounded hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400 transition-colors">
                                    ↑
                                </button>
                                <button type="button" onClick={() => moveCategory(idx, 'down')} disabled={idx === categories.length - 1}
                                    className="text-xs font-medium text-stone-400 hover:text-stone-900 px-2.5 py-1 rounded hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400 transition-colors">
                                    ↓
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════════ Readflow 数据源 ═══════════ */}
            <section className="space-y-3">
                <h2 className="font-serif text-lg font-bold text-stone-900">Readflow 数据源</h2>
                <div className="border border-stone-200 rounded-lg bg-white p-5">
                    <label className="block text-xs font-medium text-stone-500 mb-1.5">Server URL</label>
                    <input
                        value={readflowServerUrl}
                        onChange={(e) => setReadflowServerUrl(e.target.value)}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white text-sm text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent placeholder:text-stone-400"
                        placeholder="https://rsscloud.example.com/"
                    />
                    <p className="text-xs text-stone-400 mt-2">详细的订阅与分组管理请切换至「Readflow 数据源」标签页。</p>
                </div>
            </section>

            {/* ═══════════ 定时任务 ═══════════ */}
            <section className="space-y-3">
                <h2 className="font-serif text-lg font-bold text-stone-900">定时生成</h2>
                <div className="border border-stone-200 rounded-lg bg-white p-5 space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-bold text-stone-900">启用自动化任务</div>
                            <div className="text-xs text-stone-500 mt-0.5">需配合 /api/cron 路由定时调用</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setDigestScheduleEnabled((v) => !v)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${digestScheduleEnabled ? 'bg-stone-900' : 'bg-stone-200'}`}
                            aria-pressed={digestScheduleEnabled}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${digestScheduleEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="border-t border-stone-100 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5">触发时间（北京时间）</label>
                            <input
                                type="time"
                                value={digestScheduleTime}
                                onChange={(e) => setDigestScheduleTime(e.target.value)}
                                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white text-sm text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5">手动生成</label>
                            <div className="flex items-center gap-3">
                                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-stone-400 px-3 py-2 border border-stone-200 rounded-lg border-dashed">
                                    <Play className="w-3 h-3" /> 立即执行
                                </span>
                                <GenerateDigestButton />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ Bottom Save Bar ═══════════ */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-stone-200 z-30">
                <div className="max-w-5xl mx-auto flex items-center justify-end">
                    <button
                        type="submit"
                        disabled={status === 'saving'}
                        className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white text-sm font-bold rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {status === 'saving' ? (
                            <span className="animate-pulse">保存中…</span>
                        ) : (
                            <><Save className="w-4 h-4" /> 保存所有配置</>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
}
