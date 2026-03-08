'use client';

import { useState, useEffect } from 'react';
import { saveSettings } from '@/app/actions/settingsActions';
import { AlertCircle, Save, CheckCircle2, Code, X } from 'lucide-react';
import { PromptConfigEditor } from '@/components/settings/PromptConfigEditor';
import type { PromptConfig } from '@/lib/promptConfig';

interface PromptSettingsFormProps {
    initialPrompt: string;
    initialPromptConfig: PromptConfig;
    // We pass the rest of the settings just to resave them alongside
    initialCategories: string[];
    initialLayout: string;
    initialReadflowServerUrl: string;
    initialDigestScheduleEnabled: boolean;
    initialDigestScheduleTime: string;
}

export function PromptSettingsForm({
    initialPrompt,
    initialPromptConfig,
    initialCategories,
    initialLayout,
    initialReadflowServerUrl,
    initialDigestScheduleEnabled,
    initialDigestScheduleTime,
}: PromptSettingsFormProps) {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [promptConfig, setPromptConfig] = useState<PromptConfig>(initialPromptConfig);

    const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [isRawPromptOpen, setIsRawPromptOpen] = useState(false);

    useEffect(() => {
        if (isRawPromptOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isRawPromptOpen]);

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setStatus('saving');
        setErrorMsg('');
        try {
            const result = await saveSettings(
                initialCategories,
                prompt,
                initialLayout,
                initialReadflowServerUrl,
                initialDigestScheduleEnabled,
                initialDigestScheduleTime,
                promptConfig
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

            {/* AI Prompt 可视化配置 */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-serif text-lg font-bold text-stone-900">AI 系统指令配置</h2>
                        <p className="text-xs text-stone-500 mt-1">定制大语言模型在生成每日新闻简报时的行为规范和输出格式。</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsRawPromptOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                        <Code className="w-3 h-3" /> 高级：原始文本
                    </button>
                </div>
                <PromptConfigEditor config={promptConfig} onChange={setPromptConfig} />
            </section>

            {/* Bottom Save Bar */}
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
                            <><Save className="w-4 h-4" /> 保存指令配置</>
                        )}
                    </button>
                </div>
            </div>

            {/* Raw Prompt Modal (Advanced) */}
            {isRawPromptOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsRawPromptOpen(false)} />
                    <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                            <div>
                                <h3 className="font-serif text-lg font-bold text-stone-900">高级：原始 Prompt 文本</h3>
                                <p className="text-xs text-stone-400 mt-0.5">直接编辑发送给 LLM 的完整提示词（覆盖可视化配置）</p>
                            </div>
                            <button type="button" onClick={() => setIsRawPromptOpen(false)}
                                className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 p-6 overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-stone-500">Prompt Template</label>
                                <span className="text-xs text-stone-400">{prompt.length} 字符</span>
                            </div>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="flex-1 w-full min-h-[400px] p-5 bg-stone-900 text-stone-100 font-mono text-sm leading-relaxed rounded-lg focus:outline-none resize-y selection:bg-stone-700"
                                spellCheck={false}
                                placeholder="输入系统提示词，留空则使用可视化配置生成的模板..."
                            />
                            <p className="mt-3 text-xs text-stone-400 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                此处的原始文本仅在非空时覆盖可视化配置。留空则使用上方可视化编辑器的配置。
                            </p>
                        </div>

                        <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-end gap-3">
                            <button type="button" onClick={() => setIsRawPromptOpen(false)}
                                className="text-sm font-medium text-stone-500 hover:text-stone-900 px-4 py-2 rounded-lg hover:bg-stone-100 transition-colors">
                                取消
                            </button>
                            <button type="button"
                                onClick={() => setIsRawPromptOpen(false)}
                                className="text-sm font-bold text-white bg-stone-900 hover:bg-stone-700 px-5 py-2 rounded-lg transition-colors">
                                完成编辑
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}
