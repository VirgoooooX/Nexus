'use client';

import { useState } from 'react';
import type { PromptConfig, CategoryDef, ItemField, CitationField, Constraint } from '@/lib/promptConfig';
import { buildPromptFromConfig } from '@/lib/buildPromptFromConfig';
import {
    ChevronDown, ChevronRight, Plus, Trash2, GripVertical, ToggleLeft, ToggleRight,
    FileText, Tag, ListChecks, Braces, Radio, ShieldCheck, SlidersHorizontal, Eye, X, Code
} from 'lucide-react';

interface PromptConfigEditorProps {
    config: PromptConfig;
    onChange: (config: PromptConfig) => void;
}

// ─── Collapsible Section ───
function Section({ title, icon: Icon, children, defaultOpen = false }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-stone-200 rounded-lg bg-white overflow-hidden">
            <button type="button" onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-stone-50 transition-colors">
                <Icon className="w-4 h-4 text-stone-400 shrink-0" />
                <span className="font-bold text-sm text-stone-900 flex-1">{title}</span>
                {open ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
            </button>
            {open && <div className="px-5 pb-5 border-t border-stone-100 pt-4">{children}</div>}
        </div>
    );
}

// ─── Editable list of strings ───
function StringListEditor({ items, onChange, placeholder }: {
    items: string[];
    onChange: (items: string[]) => void;
    placeholder?: string;
}) {
    const update = (i: number, val: string) => {
        const next = [...items];
        next[i] = val;
        onChange(next);
    };
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    const add = () => onChange([...items, '']);

    return (
        <div className="space-y-2">
            {items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 group">
                    <span className="text-xs text-stone-400 mt-2.5 w-5 text-right shrink-0">{i + 1}.</span>
                    <textarea
                        value={item}
                        onChange={(e) => update(i, e.target.value)}
                        rows={2}
                        className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 resize-y leading-relaxed"
                        placeholder={placeholder}
                    />
                    <button type="button" onClick={() => remove(i)}
                        className="mt-2 p-1 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
            <button type="button" onClick={add}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                <Plus className="w-3 h-3" /> 添加
            </button>
        </div>
    );
}

// ─── Category Cards ───
function CategoryEditor({ categories, onChange }: {
    categories: CategoryDef[];
    onChange: (cats: CategoryDef[]) => void;
}) {
    const update = (i: number, field: keyof CategoryDef, val: string) => {
        const next = [...categories];
        next[i] = { ...next[i], [field]: val };
        onChange(next);
    };
    const remove = (i: number) => onChange(categories.filter((_, idx) => idx !== i));
    const add = () => onChange([...categories, { name: '', icon: 'folder' }]);
    const move = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= categories.length) return;
        const next = [...categories];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };

    return (
        <div className="space-y-2">
            {categories.map((cat, i) => (
                <div key={i} className="flex items-center gap-3 group px-3 py-2.5 border border-stone-100 rounded-lg hover:border-stone-200 transition-colors">
                    <GripVertical className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                    <input
                        value={cat.name}
                        onChange={(e) => update(i, 'name', e.target.value)}
                        className="flex-1 text-sm font-bold text-stone-900 bg-transparent focus:outline-none min-w-0"
                        placeholder="分类名称"
                    />
                    <input
                        value={cat.icon}
                        onChange={(e) => update(i, 'icon', e.target.value)}
                        className="w-24 text-xs text-stone-500 bg-stone-50 px-2 py-1 rounded border border-stone-100 focus:outline-none focus:ring-1 focus:ring-stone-300"
                        placeholder="icon"
                    />
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                            className="text-xs text-stone-400 hover:text-stone-900 px-1 py-0.5 disabled:opacity-30">↑</button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === categories.length - 1}
                            className="text-xs text-stone-400 hover:text-stone-900 px-1 py-0.5 disabled:opacity-30">↓</button>
                        <button type="button" onClick={() => remove(i)}
                            className="text-stone-300 hover:text-red-500 p-0.5">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            ))}
            <button type="button" onClick={add}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                <Plus className="w-3 h-3" /> 添加分类
            </button>
        </div>
    );
}

// ─── Field Tree Editor ───
function FieldEditor({ fields, onChange, label }: {
    fields: (ItemField | CitationField)[];
    onChange: (fields: (ItemField | CitationField)[]) => void;
    label: string;
}) {
    const update = (i: number, patch: Partial<ItemField | CitationField>) => {
        const next = [...fields];
        next[i] = { ...next[i], ...patch };
        onChange(next);
    };
    const remove = (i: number) => onChange(fields.filter((_, idx) => idx !== i));
    const add = () => onChange([...fields, { key: '', type: 'string' as const, description: '', required: false }]);

    return (
        <div className="space-y-3">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">{label}</div>
            {fields.map((f, i) => (
                <div key={i} className="border border-stone-100 rounded-lg p-3 space-y-2 group hover:border-stone-200 transition-colors">
                    <div className="flex items-center gap-2">
                        <Braces className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                        <input
                            value={f.key}
                            onChange={(e) => update(i, { key: e.target.value })}
                            className="flex-1 text-sm font-mono font-bold text-stone-900 bg-transparent focus:outline-none"
                            placeholder="字段名"
                        />
                        <select
                            value={f.type}
                            onChange={(e) => update(i, { type: e.target.value as any })}
                            className="text-xs bg-stone-50 border border-stone-100 rounded px-2 py-1 text-stone-600 focus:outline-none">
                            <option value="string">string</option>
                            <option value="string[]">string[]</option>
                            <option value="object[]">object[]</option>
                        </select>
                        <button type="button" onClick={() => update(i, { required: !f.required })}
                            className={`text-xs px-2 py-0.5 rounded ${f.required ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-400'}`}>
                            {f.required ? '必填' : '可选'}
                        </button>
                        <button type="button" onClick={() => remove(i)}
                            className="text-stone-300 hover:text-red-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                    <input
                        value={f.description}
                        onChange={(e) => update(i, { description: e.target.value })}
                        className="w-full text-xs text-stone-500 bg-transparent focus:outline-none px-6"
                        placeholder="字段描述（对 LLM 的说明）"
                    />
                </div>
            ))}
            <button type="button" onClick={add}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                <Plus className="w-3 h-3" /> 添加字段
            </button>
        </div>
    );
}

// ─── Constraints Editor ───
function ConstraintEditor({ constraints, onChange }: {
    constraints: Constraint[];
    onChange: (c: Constraint[]) => void;
}) {
    const toggle = (i: number) => {
        const next = [...constraints];
        next[i] = { ...next[i], enabled: !next[i].enabled };
        onChange(next);
    };
    const update = (i: number, text: string) => {
        const next = [...constraints];
        next[i] = { ...next[i], text };
        onChange(next);
    };
    const remove = (i: number) => onChange(constraints.filter((_, idx) => idx !== i));
    const add = () => onChange([...constraints, { text: '', enabled: true }]);

    return (
        <div className="space-y-2">
            {constraints.map((c, i) => (
                <div key={i} className={`flex items-start gap-3 group px-3 py-2.5 border rounded-lg transition-colors ${c.enabled ? 'border-stone-200 bg-white' : 'border-stone-100 bg-stone-50 opacity-60'}`}>
                    <button type="button" onClick={() => toggle(i)} className="mt-1 shrink-0">
                        {c.enabled
                            ? <ToggleRight className="w-5 h-5 text-stone-900" />
                            : <ToggleLeft className="w-5 h-5 text-stone-300" />
                        }
                    </button>
                    <textarea
                        value={c.text}
                        onChange={(e) => update(i, e.target.value)}
                        rows={2}
                        className="flex-1 text-sm text-stone-800 bg-transparent focus:outline-none resize-y leading-relaxed"
                        placeholder="约束规则内容"
                    />
                    <button type="button" onClick={() => remove(i)}
                        className="mt-1 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
            <button type="button" onClick={add}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                <Plus className="w-3 h-3" /> 添加约束
            </button>
        </div>
    );
}

// ─── Params Editor ───
function ParamsEditor({ params, onChange }: {
    params: PromptConfig['params'];
    onChange: (p: PromptConfig['params']) => void;
}) {
    const fields: { key: keyof typeof params; label: string; min: number; max: number; unit: string }[] = [
        { key: 'overallSummaryLength', label: '全局摘要字数', min: 50, max: 500, unit: '字' },
        { key: 'bulletsMin', label: '要点最少条数', min: 1, max: 10, unit: '条' },
        { key: 'bulletsMax', label: '要点最多条数', min: 1, max: 10, unit: '条' },
        { key: 'bulletsMaxChars', label: '每条要点最长', min: 10, max: 100, unit: '字' },
        { key: 'coverageTarget', label: '覆盖率目标', min: 0, max: 100, unit: '%' },
        { key: 'maxCitationsPerItem', label: '每条最多引用', min: 1, max: 20, unit: '条' },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((f) => (
                <div key={f.key} className="flex items-center gap-3 bg-stone-50 rounded-lg px-4 py-3 border border-stone-100">
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-stone-700">{f.label}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={params[f.key]}
                            min={f.min}
                            max={f.max}
                            onChange={(e) => onChange({ ...params, [f.key]: Number(e.target.value) || f.min })}
                            className="w-16 text-center text-sm font-bold text-stone-900 bg-white border border-stone-200 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-stone-300"
                        />
                        <span className="text-xs text-stone-400">{f.unit}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ═══════════ Main Component ═══════════
export function PromptConfigEditor({ config, onChange }: PromptConfigEditorProps) {
    const [showPreview, setShowPreview] = useState(false);

    const patch = <K extends keyof PromptConfig>(key: K, value: PromptConfig[K]) => {
        onChange({ ...config, [key]: value });
    };

    const previewText = buildPromptFromConfig(config, '2025-01-01');

    return (
        <div className="space-y-3">
            {/* 7 Configurable Panels */}
            <Section title="编辑方针 · 核心原则" icon={FileText} defaultOpen>
                <StringListEditor
                    items={config.editorialPrinciples}
                    onChange={(v) => patch('editorialPrinciples', v)}
                    placeholder="编辑方针原则..."
                />
            </Section>

            <Section title="分类定义" icon={Tag}>
                <CategoryEditor
                    categories={config.categories}
                    onChange={(v) => patch('categories', v)}
                />
            </Section>

            <Section title="分类规则" icon={ListChecks}>
                <textarea
                    value={config.categoryRules}
                    onChange={(e) => patch('categoryRules', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-stone-200 rounded-lg text-sm text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 resize-y leading-relaxed"
                    placeholder="分类组织规则..."
                />
            </Section>

            <Section title="JSON 字段定义" icon={Braces}>
                <div className="space-y-6">
                    <FieldEditor
                        label="Item 字段（每条新闻的结构）"
                        fields={config.itemFields}
                        onChange={(v) => patch('itemFields', v as ItemField[])}
                    />
                    <FieldEditor
                        label="Citation 字段（引用来源结构）"
                        fields={config.citationFields}
                        onChange={(v) => patch('citationFields', v as CitationField[])}
                    />
                </div>
            </Section>

            <Section title="追踪规则" icon={Radio}>
                <StringListEditor
                    items={config.trackingRules}
                    onChange={(v) => patch('trackingRules', v)}
                    placeholder="追踪规则..."
                />
            </Section>

            <Section title="强制约束" icon={ShieldCheck}>
                <ConstraintEditor
                    constraints={config.constraints}
                    onChange={(v) => patch('constraints', v)}
                />
            </Section>

            <Section title="输出参数" icon={SlidersHorizontal} defaultOpen>
                <ParamsEditor
                    params={config.params}
                    onChange={(v) => patch('params', v)}
                />
            </Section>

            {/* Preview Toggle */}
            <div className="pt-2">
                <button type="button" onClick={() => setShowPreview(!showPreview)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-stone-900 px-4 py-2 rounded-lg hover:bg-stone-100 transition-colors border border-stone-200">
                    {showPreview ? <X className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPreview ? '关闭预览' : '预览生成的 Prompt'}
                </button>
            </div>

            {showPreview && (
                <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-stone-900 text-stone-400">
                        <span className="text-xs font-medium flex items-center gap-1.5"><Code className="w-3.5 h-3.5" /> 生成的 Prompt 预览</span>
                        <span className="text-xs">{previewText.length} 字符</span>
                    </div>
                    <pre className="px-5 py-4 bg-stone-900 text-stone-200 text-xs font-mono leading-relaxed max-h-[500px] overflow-auto whitespace-pre-wrap">
                        {previewText}
                    </pre>
                </div>
            )}
        </div>
    );
}
