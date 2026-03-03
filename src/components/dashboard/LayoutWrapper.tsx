"use client";

import React, { useRef, useState, useEffect } from "react";
import { Sparkles, ExternalLink, RefreshCw, LayoutTemplate, ArrowUpRight } from "lucide-react";
import Link from 'next/link';

// Import views
import MasonryView from "@/components/dashboard/views/MasonryView";

const VIEW_OPTIONS = [
    { id: 'masonry', label: 'Masonry', desc: '瀑布流 / 两列分布' },
    { id: 'classic', label: 'Classic', desc: '经典单列 / 精密仪轨' }
];

export default function LayoutWrapper({
    today,
    categories,
    overallSummary,
    totalItems,
    recommendedEvents,
    trackedUpdates,
    hasData,
    activeView
}: any) {
    const [activeSection, setActiveSection] = useState(0);
    const [hoveredSection, setHoveredSection] = useState<number | null>(null);
    const [activeTheme, setActiveTheme] = useState<{ catIdx: number; themeIdx: number } | null>(null);

    // Scroll to top visibility state
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<any | null>(null);
    const [expandedItemKey, setExpandedItemKey] = useState<string | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const categoryHeadingsRef = useRef<HTMLElement[]>([]);
    const themeHeadingsRef = useRef<HTMLElement[]>([]);

    useEffect(() => {
        if (activeView !== 'classic') return;

        const refreshHeadings = () => {
            categoryHeadingsRef.current = Array.from(
                document.querySelectorAll<HTMLElement>('[data-digest-category-heading="true"]')
            );
            themeHeadingsRef.current = Array.from(
                document.querySelectorAll<HTMLElement>('[data-digest-theme-heading="true"]')
            );
        };

        const computeActiveBuiltin = () => {
            const headings = categoryHeadingsRef.current;
            if (!headings || headings.length === 0) return;
            const offset = 160;
            let bestBelowIdx: number | null = null;
            let bestBelowTop = Number.POSITIVE_INFINITY;
            let lastAboveIdx: number | null = null;
            let lastAboveTop = Number.NEGATIVE_INFINITY;

            for (const el of headings) {
                const idxStr = el.getAttribute('data-cat-idx') || '';
                const idx = Number(idxStr);
                if (!Number.isFinite(idx)) continue;
                const top = el.getBoundingClientRect().top;
                if (top - offset <= 0) {
                    if (top >= lastAboveTop) {
                        lastAboveTop = top;
                        lastAboveIdx = idx;
                    }
                } else {
                    if (top < bestBelowTop) {
                        bestBelowTop = top;
                        bestBelowIdx = idx;
                    }
                }
            }

            const isNearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
            const lastIdx = headings.length - 1;
            let next = lastAboveIdx ?? bestBelowIdx ?? 0;
            if (isNearBottom) {
                next = lastIdx;
            }
            setActiveSection((prev) => (prev === next ? prev : next));

            const themeHeadings = themeHeadingsRef.current;
            if (!themeHeadings || themeHeadings.length === 0) {
                setActiveTheme((prev) => (prev ? null : prev));
                return;
            }

            let lastAboveThemeIdx: number | null = null;
            let lastAboveThemeTop = Number.NEGATIVE_INFINITY;
            let firstBelowThemeIdx: number | null = null;
            let firstBelowThemeTop = Number.POSITIVE_INFINITY;
            let maxThemeIdx: number | null = null;
            for (const el of themeHeadings) {
                const catIdxStr = el.getAttribute('data-cat-idx') || '';
                const catIdx = Number(catIdxStr);
                if (!Number.isFinite(catIdx) || catIdx !== next) continue;
                const themeIdxStr = el.getAttribute('data-theme-idx') || '';
                const themeIdx = Number(themeIdxStr);
                if (!Number.isFinite(themeIdx)) continue;
                if (maxThemeIdx === null || themeIdx > maxThemeIdx) maxThemeIdx = themeIdx;
                const top = el.getBoundingClientRect().top;
                if (top - offset <= 0) {
                    if (top >= lastAboveThemeTop) {
                        lastAboveThemeTop = top;
                        lastAboveThemeIdx = themeIdx;
                    }
                } else {
                    if (top < firstBelowThemeTop) {
                        firstBelowThemeTop = top;
                        firstBelowThemeIdx = themeIdx;
                    }
                }
            }
            let pickedThemeIdx = lastAboveThemeIdx ?? firstBelowThemeIdx;
            if (lastAboveThemeIdx !== null && firstBelowThemeIdx !== null) {
                const distAbove = Math.abs(lastAboveThemeTop - offset);
                const distBelow = Math.abs(firstBelowThemeTop - offset);
                if (distBelow + 18 < distAbove) pickedThemeIdx = firstBelowThemeIdx;
            }

            const nextCatHeading = document.getElementById(`digest-cat-${next + 1}`);
            const nextCatTop = nextCatHeading ? nextCatHeading.getBoundingClientRect().top : null;
            const isNearCategoryEnd = typeof nextCatTop === 'number' && nextCatTop <= offset + 48;
            if ((isNearBottom && next === lastIdx) || isNearCategoryEnd) {
                if (maxThemeIdx !== null) pickedThemeIdx = maxThemeIdx;
            }
            if (pickedThemeIdx === null) {
                setActiveTheme((prev) => (prev ? null : prev));
                return;
            }
            setActiveTheme((prev) => {
                if (prev && prev.catIdx === next && prev.themeIdx === pickedThemeIdx) return prev;
                return { catIdx: next, themeIdx: pickedThemeIdx };
            });
        };

        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 500);
            if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = requestAnimationFrame(() => {
                computeActiveBuiltin();
            });
        };

        const handleResize = () => {
            refreshHeadings();
            handleScroll();
        };

        refreshHeadings();
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize);

        return () => {
            if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
            window.removeEventListener('scroll', handleScroll as any);
            window.removeEventListener('resize', handleResize);
        }
    }, [activeView, categories]);

    useEffect(() => {
        if (activeView === 'classic') return;
        setHoveredItem(null);
        setExpandedItemKey(null);
    }, [activeView]);

    // Pack data to match demo component expectations
    const mockDataFormat = {
        date: today,
        overallSummary: overallSummary,
        categories: categories,
        recommendedEvents: recommendedEvents,
        trackedUpdates: trackedUpdates
    };
    const activeDigestItem = hoveredItem;

    const getItemKey = (item: any) => {
        const url = typeof item?.url === 'string' ? item.url : '';
        if (url) return url;
        const citations = Array.isArray(item?.citations) ? item.citations : [];
        const c0 = citations[0];
        const cUrl = typeof c0?.url === 'string' ? c0.url : '';
        if (cUrl) return cUrl;
        return typeof item?.headline === 'string' ? item.headline : '';
    };

    const renderCitations = (item: any) => {
        const citations = Array.isArray(item?.citations) ? item.citations : [];
        if (citations.length > 0) {
            return (
                <span className="text-stone-500 dark:text-stone-400">
                    （
                    {citations.slice(0, 3).map((c: any, idx: number) => (
                        <React.Fragment key={`${c?.url || idx}`}>
                            <a
                                href={c?.url || ''}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="underline underline-offset-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                {c?.source || '来源'}
                            </a>
                            {idx < Math.min(2, citations.length - 1) ? '，' : ''}
                        </React.Fragment>
                    ))}
                    ）
                </span>
            );
        }
        const url = typeof item?.url === 'string' ? item.url : '';
        const source = typeof item?.source === 'string' ? item.source : '来源';
        if (!url) return null;
        return (
            <span className="text-stone-500 dark:text-stone-400">
                （
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="underline underline-offset-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                    {source}
                </a>
                ）
            </span>
        );
    };

    if (!hasData) {
        return (
            <div className="text-center py-32 bg-white border border-stone-200 rounded-2xl mx-5 mt-10">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100">
                    <RefreshCw className="w-6 h-6 text-stone-300" />
                </div>
                <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto">
                    尚未生成今日高密度视角的新闻日报。<br />
                    请点击右下角按钮，让 AI 引擎为您深度扫描全球议题。
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 transition-colors duration-500 relative">

            {/* Main Content Area */}
            <main className={`transition-opacity duration-500 ease-in-out`}>
                {activeView === 'masonry' && (
                    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in zoom-in-95 duration-500">
                        <MasonryView data={mockDataFormat} />
                    </div>
                )}

                {activeView === 'classic' && (
                    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 sm:py-12 animate-in fade-in duration-700 font-sans tracking-tight">
                        {/* Original Classic View Content extracted from old page.tsx */}
                        <header className="relative pb-6 border-b border-stone-300 dark:border-stone-800 mb-8 sm:mb-12">
                            <div className="flex items-center gap-4 mb-3">
                                <span className="w-8 h-1 bg-blue-600 dark:bg-blue-500"></span>
                                <p className="text-[11px] tracking-[0.25em] font-bold uppercase text-stone-500 dark:text-stone-400">
                                    Classic List Edition
                                </p>
                            </div>
                            <h1 className="text-5xl sm:text-7xl font-black text-stone-900 dark:text-white leading-[1.05] mb-6 tracking-tighter">
                                今日全球日报
                            </h1>
                            <div className="flex items-center gap-4 text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                                <span className="text-stone-900 dark:text-white bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-md">{today}</span>
                                {totalItems > 0 && (
                                    <>
                                        <span>/</span>
                                        <span>{totalItems} Signals</span>
                                        <span>/</span>
                                        <span>{categories.length} Sectors</span>
                                    </>
                                )}
                            </div>
                        </header>

                        {/* Overall Summary */}
                        {overallSummary && (
                            <div className="border-l-2 border-blue-600 dark:border-blue-500 pl-5 py-2 mb-10">
                                <p className="text-stone-700 dark:text-stone-300 text-lg sm:text-xl leading-relaxed font-medium">
                                    {overallSummary}
                                </p>
                            </div>
                        )}

                        {Array.isArray(trackedUpdates) && trackedUpdates.length > 0 && (
                            <section className="mb-12">
                                <div className="flex items-baseline gap-4 mb-8 pb-3 border-b border-stone-200 dark:border-stone-800">
                                    <span className="text-blue-600 dark:text-blue-500 font-mono text-sm font-bold">00</span>
                                    <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">
                                        今日追踪更新
                                    </h2>
                                </div>
                                <div className="space-y-10 pl-0 sm:pl-8">
                                    {trackedUpdates.map((u: any) => (
                                        <div key={u?.eventId || u?.eventName} className="space-y-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <h3 className="text-lg font-black text-stone-900 dark:text-white tracking-tight">
                                                    {u?.eventName || '未命名事件'}
                                                </h3>
                                                {u?.eventId && (
                                                    <Link
                                                        href={`/events/${encodeURIComponent(u.eventId)}`}
                                                        className="text-xs font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                    >
                                                        查看详情 <ArrowUpRight className="inline w-3 h-3" />
                                                    </Link>
                                                )}
                                            </div>
                                            <ul className="space-y-3">
                                                {(Array.isArray(u?.highlights) ? u.highlights : []).slice(0, 4).map((h: any, idx: number) => (
                                                    <li key={idx} className="flex gap-3 items-start">
                                                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
                                                        <p className="text-stone-800 dark:text-stone-200 leading-relaxed text-base font-medium">
                                                            {h?.headline}
                                                            {h?.summary ? `，${h.summary}` : ''}
                                                            {renderCitations(h)}
                                                        </p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Side Navigation (Progress Indicator) */}
                        <div className="hidden xl:block fixed left-8 2xl:left-20 top-1/2 -translate-y-1/2 z-50 w-fit max-w-[320px]">
                            <div className="relative">
                                <div className="pointer-events-none absolute -top-3 left-0 right-0 h-10 bg-gradient-to-b from-stone-50 dark:from-stone-950 to-transparent z-10" />
                                <div className="pointer-events-none absolute -bottom-3 left-0 right-0 h-10 bg-gradient-to-t from-stone-50 dark:from-stone-950 to-transparent z-10" />
                                <div className="max-h-[72vh] overflow-y-auto pr-2">
                                    <div className="flex flex-col items-start gap-4">
                                        {categories.map((cat: any, idx: number) => {
                                            const isExpanded = activeSection === idx || hoveredSection === idx || activeTheme?.catIdx === idx;
                                            const distance = activeSection === -1 ? 0 : Math.abs(activeSection - idx);

                                            let fadeClass = "opacity-100";
                                            if (activeSection !== -1 && activeSection !== idx) {
                                                if (distance === 1) fadeClass = "opacity-85";
                                                else if (distance === 2) fadeClass = "opacity-60";
                                                else fadeClass = "opacity-35";
                                            }

                                            return (
                                                <div
                                                    key={`nav-${idx}`}
                                                    className={`transition-opacity duration-300 ${fadeClass} hover:opacity-100`}
                                                    onMouseEnter={() => setHoveredSection(idx)}
                                                    onMouseLeave={() => setHoveredSection(null)}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveSection(idx);
                                                            setActiveTheme(null);
                                                            const el = document.getElementById(`digest-cat-${idx}`);
                                                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                        }}
                                                        className={`group inline-flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors ${activeSection === idx ? 'bg-white/70 dark:bg-stone-900/45' : 'hover:bg-white/60 dark:hover:bg-stone-900/35'}`}
                                                    >
                                                        <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                                                            <div className={`transition-all duration-500 rounded-full ${activeSection === idx ? 'w-3 h-3 bg-blue-600 dark:bg-blue-400' : 'w-1.5 h-1.5 bg-stone-300 dark:bg-stone-600 group-hover:bg-stone-500 dark:group-hover:bg-stone-400 group-hover:scale-150'}`} />
                                                            {activeSection === idx && (
                                                                <div className="absolute w-8 h-8 border border-blue-600/30 dark:border-blue-400/30 rounded-full animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
                                                            )}
                                                        </div>
                                                        <div className={`min-w-0 max-w-[260px] rounded-lg px-3 py-2 transition-all duration-300 ${activeSection === idx ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-lg' : 'text-stone-700 dark:text-stone-300'}`}>
                                                            <div className={`truncate ${activeSection === idx ? 'text-[13px] font-black tracking-widest uppercase' : 'text-[12px] font-bold tracking-widest uppercase'}`}>
                                                                {cat.name}
                                                            </div>
                                                        </div>
                                                    </button>

                                                    <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 mt-0'} ml-12`}>
                                                        <div className="overflow-hidden">
                                                            <div className="flex flex-col items-start gap-1.5">
                                                                {cat.themes?.map((theme: any, tIdx: number) => (
                                                                    <button
                                                                        key={`nav-${idx}-theme-${tIdx}`}
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveSection(idx);
                                                                            setActiveTheme({ catIdx: idx, themeIdx: tIdx });
                                                                            const target = document.getElementById(`digest-cat-${idx}-theme-${tIdx}`);
                                                                            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                        }}
                                                                        className={`group/theme inline-flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${activeTheme?.catIdx === idx && activeTheme?.themeIdx === tIdx ? 'bg-blue-50 dark:bg-blue-900/20 text-stone-900 dark:text-stone-50' : 'hover:bg-white/60 dark:hover:bg-stone-900/35 text-stone-600 dark:text-stone-400'}`}
                                                                    >
                                                                        <div
                                                                            className={`transition-all duration-300 rounded-full ${activeTheme?.catIdx === idx && activeTheme?.themeIdx === tIdx
                                                                                ? 'w-2.5 h-2.5 bg-blue-600 dark:bg-blue-400 shadow-[0_0_0_6px_rgba(37,99,235,0.12)] dark:shadow-[0_0_0_6px_rgba(59,130,246,0.14)]'
                                                                                : 'w-1.5 h-1.5 bg-stone-300 dark:bg-stone-700 group-hover/theme:bg-blue-500 dark:group-hover/theme:bg-blue-400 group-hover/theme:scale-150'
                                                                                }`}
                                                                        />
                                                                        <div className="min-w-0 max-w-[240px]">
                                                                            <div className="truncate text-[12px] font-bold tracking-wider">
                                                                                {theme.themeName}
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-10">
                            {categories.map((category: any, catIdx: number) => {
                                return (
                                    <section key={catIdx} id={`category-${catIdx}`} className="group relative scroll-mt-24">
                                        <div className="flex items-baseline gap-4 mb-8 pb-3 border-b border-stone-200 dark:border-stone-800">
                                            <span className="text-blue-600 dark:text-blue-500 font-mono text-sm font-bold">
                                                {String(catIdx + 1).padStart(2, '0')}
                                            </span>
                                            <h2
                                                id={`digest-cat-${catIdx}`}
                                                data-digest-category-heading="true"
                                                data-cat-idx={catIdx}
                                                className="text-3xl font-black text-stone-900 dark:text-white tracking-tight scroll-mt-28"
                                            >
                                                {category.name}
                                            </h2>
                                        </div>

                                        <div className="pl-0 sm:pl-8">
                                            {category.themes && category.themes.length > 0 && (
                                                <div className="space-y-10">
                                                    {category.themes.map((theme: any, themeIdx: number) => (
                                                        <div key={themeIdx}>
                                                            <div className="inline-block mb-6 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                                                <h3
                                                                    id={`digest-cat-${catIdx}-theme-${themeIdx}`}
                                                                    data-digest-theme-heading="true"
                                                                    data-cat-idx={catIdx}
                                                                    data-theme-idx={themeIdx}
                                                                    className="text-lg font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center gap-3 scroll-mt-28"
                                                                >
                                                                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-500 animate-pulse"></span>
                                                                    {theme.themeName}
                                                                </h3>
                                                            </div>
                                                            <ul className="space-y-4">
                                                                {theme.items.map((item: any, idx: number) => (
                                                                    <li
                                                                        key={idx}
                                                                        className="flex gap-3 items-start relative group/item cursor-pointer"
                                                                        onMouseEnter={() => {
                                                                            setHoveredItem(item);
                                                                        }}
                                                                        onMouseLeave={() => {
                                                                            setHoveredItem(null);
                                                                        }}
                                                                        onClick={() => {
                                                                            const key = getItemKey(item);
                                                                            setHoveredItem(item);
                                                                            setExpandedItemKey((prev) => (prev === key ? null : key));
                                                                        }}
                                                                    >
                                                                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0 group-hover/item:bg-blue-600 dark:group-hover/item:bg-blue-400 transition-colors" />
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-stone-800 dark:text-stone-200 leading-relaxed text-base font-medium">
                                                                                {item.headline}
                                                                                {item.summary ? `，${item.summary}` : ''}
                                                                                {renderCitations(item)}
                                                                            </p>
                                                                            {expandedItemKey === getItemKey(item) && (
                                                                                <div className="mt-3 pl-4 border-l border-stone-200 dark:border-stone-800 space-y-3">
                                                                                    {(Array.isArray(item?.relatedTrackers) ? item.relatedTrackers : []).length > 0 ? (
                                                                                        <div className="space-y-2">
                                                                                            <div className="text-[10px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-[0.28em]">
                                                                                                相关追踪
                                                                                            </div>
                                                                                            <div className="space-y-2">
                                                                                                {(item.relatedTrackers || []).map((t: any, rIdx: number) => (
                                                                                                    <div key={rIdx} className="space-y-1">
                                                                                                        <Link
                                                                                                            href={`/events/${encodeURIComponent(t.id)}`}
                                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                                            className="inline-flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                                                                        >
                                                                                                            {t.name}
                                                                                                            <ArrowUpRight className="w-4 h-4" />
                                                                                                        </Link>
                                                                                                        {t.lastNodeHeadline && (
                                                                                                            <div className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                                                                                                                {t.lastNodeDate ? `${t.lastNodeDate} · ` : ''}{t.lastNodeHeadline}
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="space-y-2">
                                                                                            <div className="text-[10px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-[0.28em]">
                                                                                                引用来源
                                                                                            </div>
                                                                                            {(() => {
                                                                                                const citations = Array.isArray(item?.citations)
                                                                                                    ? item.citations.filter((c: any) => {
                                                                                                        const title = typeof c?.title === 'string' ? c.title.trim() : '';
                                                                                                        const url = typeof c?.url === 'string' ? c.url.trim() : '';
                                                                                                        return Boolean(title && url);
                                                                                                    })
                                                                                                    : [];
                                                                                                if (citations.length === 0) {
                                                                                                    return (
                                                                                                        <div className="text-sm text-stone-500 dark:text-stone-400">
                                                                                                            无可用引用
                                                                                                        </div>
                                                                                                    );
                                                                                                }
                                                                                                return (
                                                                                                    <div className="space-y-2">
                                                                                                        {citations.map((c: any, cIdx: number) => (
                                                                                                            <a
                                                                                                                key={`${c?.url || cIdx}`}
                                                                                                                href={c?.url || ''}
                                                                                                                target="_blank"
                                                                                                                rel="noopener noreferrer"
                                                                                                                onClick={(e) => e.stopPropagation()}
                                                                                                                className="block"
                                                                                                            >
                                                                                                                <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2">
                                                                                                                    {c?.title || ''}
                                                                                                                </div>
                                                                                                                <div className="text-xs text-stone-500 dark:text-stone-400">
                                                                                                                    {c?.source || '来源'}
                                                                                                                </div>
                                                                                                            </a>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                );
                                                                                            })()}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>

                        {(activeDigestItem || recommendedEvents.length > 0) && (
                            <div className="hidden xl:block fixed right-10 top-[20%] z-[90] w-80">
                                <div className="relative border-l border-stone-300 dark:border-stone-800 pl-8 py-4">
                                    <div className="absolute top-0 left-0 w-4 h-px bg-stone-300 dark:bg-stone-800"></div>
                                    <div className="absolute top-0 left-0 w-px h-4 bg-stone-300 dark:bg-stone-800"></div>

                                    {activeDigestItem ? (
                                        <div className="flex flex-col">
                                            <div className="flex items-start justify-between mb-6 gap-4">
                                                <div className="flex flex-col gap-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-500 rounded-full"></div>
                                                        <h3 className="text-[10px] font-black text-stone-900 dark:text-white uppercase tracking-[0.3em]">
                                                            相关追踪
                                                        </h3>
                                                    </div>
                                                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-snug line-clamp-3">
                                                        {activeDigestItem.headline}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-6 relative">
                                                <div className="absolute left-[-33px] top-0 bottom-0 w-px bg-gradient-to-b from-blue-600/40 via-blue-600/10 to-transparent"></div>

                                                {(Array.isArray(activeDigestItem.relatedTrackers) ? activeDigestItem.relatedTrackers : []).length > 0 ? (
                                                    (activeDigestItem.relatedTrackers || []).map((t: any, idx: number) => (
                                                        <div key={idx} className="relative">
                                                            <div className="absolute left-[-36px] top-1.5 w-1.5 h-1.5 rounded-full bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 z-10"></div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-tighter mb-2">
                                                                    Tracking
                                                                </span>
                                                                <Link
                                                                    href={`/events/${encodeURIComponent(t.id)}`}
                                                                    className="font-serif italic text-lg text-stone-900 dark:text-white leading-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-2"
                                                                >
                                                                    {t.name}
                                                                </Link>
                                                                {t.lastNodeHeadline && (
                                                                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed font-medium line-clamp-3">
                                                                        {t.lastNodeDate ? `${t.lastNodeDate} · ` : ''}{t.lastNodeHeadline}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                                                        未发现相关追踪事件
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between mb-10">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-500 rounded-full animate-pulse"></div>
                                                        <h3 className="text-[10px] font-black text-stone-900 dark:text-white uppercase tracking-[0.3em]">
                                                            Live Radar
                                                        </h3>
                                                    </div>
                                                    <p className="text-[9px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                                                        Autonomous Scanning...
                                                    </p>
                                                </div>
                                                <div className="text-[10px] font-mono text-stone-300 dark:text-stone-700 tabular-nums uppercase">
                                                    ID: {today.replace(/-/g, '')}
                                                </div>
                                            </div>

                                            <div className="space-y-12 relative">
                                                <div className="absolute left-[-33px] top-0 bottom-0 w-px bg-gradient-to-b from-blue-600/50 via-blue-600/20 to-transparent"></div>

                                                {recommendedEvents.slice(0, 3).map((rec: any, idx: number) => (
                                                    <div key={idx} className="group/radar-item relative">
                                                        <div className="absolute left-[-36px] top-1.5 w-1.5 h-1.5 rounded-full bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 group-hover/radar-item:border-blue-500 transition-colors z-10"></div>

                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-tighter mb-2 opacity-0 group-hover/radar-item:opacity-100 transition-opacity translate-x-[-4px] group-hover/radar-item:translate-x-0 duration-300">
                                                                Recommended for tracking
                                                            </span>
                                                            <h4 className="font-serif italic text-lg text-stone-900 dark:text-white leading-tight group-hover/radar-item:text-blue-600 dark:group-hover/radar-item:text-blue-400 transition-colors mb-3">
                                                                {rec.name}
                                                            </h4>
                                                            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed font-medium line-clamp-3 mb-4">
                                                                {rec.reason}
                                                            </p>
                                                            <Link
                                                                href={`/events/new?name=${encodeURIComponent(rec.name)}&query=${encodeURIComponent(rec.query)}`}
                                                                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-stone-900 dark:text-white group-hover/radar-item:text-blue-600 dark:group-hover/radar-item:text-blue-400 transition-all border-b border-stone-200 dark:border-stone-800 pb-1 w-fit"
                                                            >
                                                                Deploy Tracker <ArrowUpRight className="w-3 h-3" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Scroll to Top Button */}
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className={`fixed bottom-24 right-6 sm:bottom-28 sm:right-10 z-[110] p-3 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-lg text-stone-500 dark:text-stone-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-500 outline-none ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
                            aria-label="Scroll to top"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                        </button>

                    </div>
                )}
            </main>

        </div>
    );
}
