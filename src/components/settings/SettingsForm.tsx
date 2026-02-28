'use client';

import { useState } from 'react';
import { saveSettings } from '@/app/actions/settingsActions';
import { GripVertical, AlertCircle, Save, CheckCircle2, LayoutTemplate, Rss, Plus, Trash2 } from 'lucide-react';

interface SettingsFormProps {
    initialCategories: string[];
    initialPrompt: string;
    initialLayout: string;
    initialReadflowServerUrl: string;
    initialReadflowSources: Array<{ url: string; groupName: string; enabled: boolean }>;
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
    initialReadflowSources
}: SettingsFormProps) {
    const [categories, setCategories] = useState(initialCategories);
    const [prompt, setPrompt] = useState(initialPrompt);
    const [layout, setLayout] = useState(initialLayout);
    const [readflowServerUrl, setReadflowServerUrl] = useState(initialReadflowServerUrl);
    const [readflowSources, setReadflowSources] = useState(initialReadflowSources);
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('saving');
        setErrorMsg('');

        try {
            const result = await saveSettings(categories, prompt, layout, readflowServerUrl, readflowSources);
            if (result.success) {
                setStatus('success');
                setTimeout(() => setStatus('idle'), 2000);
            } else {
                setStatus('error');
                setErrorMsg(result.error || '保存失败');
            }
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(String(err));
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-12 pb-16">

            {/* Status Alert */}
            {status === 'success' && (
                <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="w-5 h-5" /> 配置已成功保存！首页面板将以新顺序渲染。
                </div>
            )}
            {status === 'error' && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                    <AlertCircle className="w-5 h-5" /> {errorMsg}
                </div>
            )}

            {/* Section 0: Default Layout Override */}
            <section className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-stone-100 bg-stone-50/50">
                    <h2 className="font-serif text-xl font-bold text-stone-900 mb-1 flex items-center gap-2">
                        <LayoutTemplate className="w-5 h-5" /> 首页默认排版风格
                    </h2>
                    <p className="text-sm text-stone-500">选择您最喜欢的主页资讯展示方式。</p>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {VIEW_OPTIONS.map(view => (
                            <button
                                key={view.id}
                                type="button"
                                onClick={() => setLayout(view.id)}
                                className={`text-left p-5 rounded-xl border-2 transition-all ${layout === view.id
                                    ? 'border-stone-900 bg-stone-50'
                                    : 'border-stone-200 bg-white hover:border-stone-300'
                                    }`}
                            >
                                <div className="font-bold text-stone-900 text-lg mb-1">{view.label}</div>
                                <div className="text-sm text-stone-500">{view.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Section 1: Categories Sorting */}
            <section className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-stone-100 bg-stone-50/50">
                    <h2 className="font-serif text-xl font-bold text-stone-900 mb-1">首页分类版块排序</h2>
                    <p className="text-sm text-stone-500">自定义五大新闻维度的展示顺序（从上至下）。</p>
                </div>
                <div className="p-6">
                    <ul className="space-y-2">
                        {categories.map((cat, idx) => (
                            <li key={cat} className="flex items-center gap-4 p-3 bg-white border border-stone-200 rounded-lg group hover:border-stone-400 transition-colors">
                                <GripVertical className="w-5 h-5 text-stone-300" />
                                <span className="font-bold text-stone-800 flex-1">{cat}</span>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => moveCategory(idx, 'up')}
                                        disabled={idx === 0}
                                        className="text-xs font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 hover:text-stone-900 px-3 py-1.5 rounded disabled:opacity-30 transition-colors"
                                    >
                                        上移
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveCategory(idx, 'down')}
                                        disabled={idx === categories.length - 1}
                                        className="text-xs font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 hover:text-stone-900 px-3 py-1.5 rounded disabled:opacity-30 transition-colors"
                                    >
                                        下移
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* Section 2: Custom AI Prompt */}
            <section className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-stone-100 bg-stone-50/50">
                    <h2 className="font-serif text-xl font-bold text-stone-900 mb-1">自定义 AI 系统指令 (Prompt)</h2>
                    <p className="text-sm text-stone-500">修改底层引擎用于生成「全球新闻日报」的 GPT 提示词。修改前请确保了解 JSON 格式要求。</p>
                </div>
                <div className="p-6">
                    <div className="relative">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full h-[500px] p-5 bg-stone-900 text-stone-200 font-mono text-sm leading-relaxed rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent resize-y"
                            spellCheck={false}
                        />
                        <div className="absolute top-3 right-5 text-[10px] uppercase font-bold tracking-widest text-stone-500 pointer-events-none">
                            System Prompt
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-stone-100 bg-stone-50/50">
                    <h2 className="font-serif text-xl font-bold text-stone-900 mb-1 flex items-center gap-2">
                        <Rss className="w-5 h-5" /> Readflow RSS 数据源
                    </h2>
                    <p className="text-sm text-stone-500">配置 Readflow 服务地址，并管理要抓取的 RSS 源与分组（保存即同步）。</p>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold tracking-widest uppercase text-stone-500">Readflow Server URL</label>
                        <input
                            value={readflowServerUrl}
                            onChange={(e) => setReadflowServerUrl(e.target.value)}
                            className="w-full px-4 py-3 border border-stone-200 rounded-lg bg-white text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-stone-400"
                            placeholder="https://rsscloud.198909.xyz:37891/"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-bold text-stone-800">订阅源列表</div>
                            <button
                                type="button"
                                onClick={() => setReadflowSources((prev) => [...prev, { url: '', groupName: 'Nexus日报组', enabled: true }])}
                                className="inline-flex items-center gap-2 text-xs font-bold text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" /> 新增源
                            </button>
                        </div>

                        <div className="overflow-hidden border border-stone-200 rounded-lg">
                            <div className="grid grid-cols-12 bg-stone-50 text-[11px] font-bold tracking-widest uppercase text-stone-500 px-4 py-3">
                                <div className="col-span-2">启用</div>
                                <div className="col-span-6">URL</div>
                                <div className="col-span-3">分组</div>
                                <div className="col-span-1 text-right">操作</div>
                            </div>
                            <div className="divide-y divide-stone-100">
                                {readflowSources.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-12 items-center gap-2 px-4 py-3">
                                        <div className="col-span-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setReadflowSources((prev) =>
                                                        prev.map((r, i) => (i === idx ? { ...r, enabled: !r.enabled } : r))
                                                    )
                                                }
                                                className={`w-12 h-7 rounded-full border transition-colors relative ${row.enabled ? 'bg-stone-900 border-stone-900' : 'bg-white border-stone-200'}`}
                                                aria-label="toggle"
                                            >
                                                <span
                                                    className={`absolute top-0.5 transition-all w-6 h-6 rounded-full bg-white ${row.enabled ? 'left-[22px]' : 'left-0.5'} shadow`}
                                                />
                                            </button>
                                        </div>
                                        <div className="col-span-6">
                                            <input
                                                value={row.url}
                                                onChange={(e) =>
                                                    setReadflowSources((prev) =>
                                                        prev.map((r, i) => (i === idx ? { ...r, url: e.target.value } : r))
                                                    )
                                                }
                                                className="w-full px-3 py-2 border border-stone-200 rounded-md bg-white text-stone-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-400"
                                                placeholder="https://example.com/rss"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <input
                                                value={row.groupName}
                                                onChange={(e) =>
                                                    setReadflowSources((prev) =>
                                                        prev.map((r, i) => (i === idx ? { ...r, groupName: e.target.value } : r))
                                                    )
                                                }
                                                className="w-full px-3 py-2 border border-stone-200 rounded-md bg-white text-stone-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-400"
                                                placeholder="Nexus日报组"
                                            />
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setReadflowSources((prev) => prev.filter((_, i) => i !== idx))}
                                                className="p-2 rounded-md hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors"
                                                aria-label="remove"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {readflowSources.length === 0 && (
                                    <div className="px-4 py-10 text-center text-sm text-stone-500">
                                        暂无订阅源。新增源后保存，即会同步到 Readflow。
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Floating Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-stone-200 z-50">
                <div className="max-w-4xl mx-auto flex justify-end">
                    <button
                        type="submit"
                        disabled={status === 'saving'}
                        className="px-6 py-3 bg-stone-900 text-white font-bold rounded-lg shadow-lg hover:bg-stone-700 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center gap-2"
                    >
                        {status === 'saving' ? (
                            '保存中...'
                        ) : (
                            <><Save className="w-4 h-4" /> 保存所有配置</>
                        )}
                    </button>
                </div>
            </div>

        </form>
    );
}
