"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ExternalLink, RefreshCw, LayoutTemplate, ArrowUpRight, Pin, X } from "lucide-react";
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
    hasData,
    activeView
}: any) {
    const [activeSection, setActiveSection] = useState(0);
    const [hoveredSection, setHoveredSection] = useState<number | null>(null);

    // Scroll to top visibility state
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<any | null>(null);
    const [pinnedItem, setPinnedItem] = useState<any | null>(null);

    useEffect(() => {
        if (activeView !== 'classic') return;

        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 500);
        };
        window.addEventListener('scroll', handleScroll);

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const idx = parseInt(entry.target.id.replace('category-', ''));
                        if (!isNaN(idx)) {
                            setActiveSection(idx);
                        }
                    }
                });
            },
            { rootMargin: '-10% 0px -50% 0px', threshold: 0 }
        );

        const sections = document.querySelectorAll('section[id^="category-"]');
        sections.forEach((s) => observer.observe(s));

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', handleScroll);
        }
    }, [activeView, categories]);

    useEffect(() => {
        if (activeView === 'classic') return;
        setHoveredItem(null);
        setPinnedItem(null);
    }, [activeView]);

    // Pack data to match demo component expectations
    const mockDataFormat = {
        date: today,
        overallSummary: overallSummary,
        categories: categories,
        recommendedEvents: recommendedEvents
    };
    const activeDigestItem = pinnedItem || hoveredItem;

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

                        {/* Side Navigation (Progress Indicator) */}
                        <div className="hidden xl:flex flex-col items-start gap-8 fixed left-8 2xl:left-20 top-1/2 -translate-y-1/2 z-50">
                            {categories.map((cat: any, idx: number) => {
                                const isExpanded = activeSection === idx || hoveredSection === idx;
                                const distance = activeSection === -1 ? 0 : Math.abs(activeSection - idx);

                                let fadeClass = "opacity-100";
                                if (activeSection !== -1 && activeSection !== idx) {
                                    if (distance === 1) fadeClass = "opacity-80";
                                    else if (distance === 2) fadeClass = "opacity-50";
                                    else fadeClass = "opacity-30";
                                }

                                return (
                                    <div
                                        key={`nav-${idx}`}
                                        className={`relative flex flex-col items-center transition-all duration-500 ${fadeClass} hover:opacity-100`}
                                        onMouseEnter={() => setHoveredSection(idx)}
                                        onMouseLeave={() => setHoveredSection(null)}
                                    >
                                        <button
                                            onClick={() => {
                                                const el = document.getElementById(`category-${idx}`);
                                                if (el) {
                                                    const y = el.getBoundingClientRect().top + window.scrollY - 100;
                                                    window.scrollTo({ top: y, behavior: 'smooth' });
                                                }
                                            }}
                                            className="group flex items-center relative w-10 h-10 justify-center outline-none"
                                        >
                                            <div className={`transition-all duration-500 rounded-full ${activeSection === idx ? 'w-3 h-3 bg-blue-600 dark:bg-blue-400' : 'w-1.5 h-1.5 bg-stone-300 dark:bg-stone-600 group-hover:bg-stone-500 dark:group-hover:bg-stone-400 group-hover:scale-150'}`} />
                                            {activeSection === idx && (
                                                <div className="absolute w-8 h-8 border border-blue-600/30 dark:border-blue-400/30 rounded-full animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                                            )}

                                            <div className={`absolute left-10 px-3 py-1.5 rounded flex items-center whitespace-nowrap pointer-events-none transition-all duration-300 origin-left ${activeSection === idx ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-[14px] font-black tracking-widest uppercase shadow-lg scale-100 translate-x-0' : 'text-stone-600 dark:text-stone-300 text-[13px] font-bold tracking-widest uppercase scale-100 translate-x-0 group-hover:text-stone-900 dark:group-hover:text-stone-100 group-hover:translate-x-1'}`}>
                                                {cat.name}
                                                {activeSection === idx && (
                                                    <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-stone-900 dark:bg-white rotate-45"></div>
                                                )}
                                            </div>
                                        </button>

                                        {/* Sub-themes expansion */}
                                        <div
                                            className={`flex flex-col items-center transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-96 opacity-100 mt-2 mb-2 pointer-events-auto' : 'max-h-0 opacity-0 mt-0 mb-0 pointer-events-none'}`}
                                        >
                                            {cat.themes?.map((theme: any, tIdx: number) => (
                                                <button
                                                    key={`nav-${idx}-theme-${tIdx}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Fallback to scrolling to category if theme ID string match is complex
                                                        // To make this fully exact we'd need theme IDs in the elements,
                                                        // but scrolling to the category is a good fallback
                                                        const el = document.getElementById(`category-${idx}`);
                                                        if (el) {
                                                            const themeElements = el.querySelectorAll('h3');
                                                            let targetEl: any = el;
                                                            // find the specific theme header
                                                            themeElements.forEach(h3 => {
                                                                if (h3.textContent?.includes(theme.themeName)) {
                                                                    targetEl = h3;
                                                                }
                                                            });
                                                            const y = targetEl.getBoundingClientRect().top + window.scrollY - 120;
                                                            window.scrollTo({ top: y, behavior: 'smooth' });
                                                        }
                                                    }}
                                                    className="group flex items-center relative w-10 h-8 justify-center outline-none z-10"
                                                >
                                                    <div
                                                        className="absolute w-px bg-stone-200 dark:bg-stone-800"
                                                        style={{
                                                            ...((tIdx > 0)
                                                                ? { top: '-13px', height: '26px' }
                                                                : (activeSection === idx)
                                                                    ? { top: '-12px', height: '25px' }
                                                                    : { top: '-25px', height: '38px' }
                                                            )
                                                        }}
                                                    />
                                                    {tIdx === cat.themes.length - 1 && (
                                                        <div className="absolute w-px bg-gradient-to-b from-stone-200 dark:from-stone-800 to-transparent z-0" style={{ top: '19px', height: '16px' }} />
                                                    )}
                                                    <div className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700 group-hover:bg-blue-500 dark:group-hover:bg-blue-400 group-hover:scale-150 transition-all duration-300 z-10 relative" />

                                                    <div className="absolute left-10 px-2 py-1 text-[12px] font-bold tracking-wider text-stone-500 dark:text-stone-400 whitespace-nowrap opacity-100 translate-x-0 transition-all duration-300 flex items-center group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                                        <span className="w-3 h-px bg-stone-300 dark:bg-stone-700 mr-2 group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors"></span>
                                                        {theme.themeName}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="space-y-10">
                            {categories.map((category: any, catIdx: number) => {
                                return (
                                    <section key={catIdx} id={`category-${catIdx}`} className="group relative scroll-mt-24">
                                        <div className="flex items-baseline gap-4 mb-8 pb-3 border-b border-stone-200 dark:border-stone-800">
                                            <span className="text-blue-600 dark:text-blue-500 font-mono text-sm font-bold">
                                                {String(catIdx + 1).padStart(2, '0')}
                                            </span>
                                            <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">
                                                {category.name}
                                            </h2>
                                        </div>

                                        <div className="pl-0 sm:pl-8">
                                            {category.themes && category.themes.length > 0 && (
                                                <div className="space-y-10">
                                                    {category.themes.map((theme: any, themeIdx: number) => (
                                                        <div key={themeIdx}>
                                                            <div className="inline-block mb-6 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                                                <h3 className="text-lg font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center gap-3">
                                                                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-500 animate-pulse"></span>
                                                                    {theme.themeName}
                                                                </h3>
                                                            </div>
                                                            <ul className="space-y-8">
                                                                {theme.items.map((item: any, idx: number) => (
                                                                    <li key={idx} className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start relative group/item">
                                                                        <div className="shrink-0 mt-1.5 sm:w-24">
                                                                            <span className="inline-block text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
                                                                                {item.source}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            {item.url ? (
                                                                                <a
                                                                                    href={item.url}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    onMouseEnter={() => {
                                                                                        if (pinnedItem) return;
                                                                                        setHoveredItem(item);
                                                                                    }}
                                                                                    onMouseLeave={() => {
                                                                                        if (pinnedItem) return;
                                                                                        setHoveredItem(null);
                                                                                    }}
                                                                                    onClick={() => {
                                                                                        setPinnedItem((prev: any) => (prev?.url === item.url ? null : item));
                                                                                        setHoveredItem(item);
                                                                                    }}
                                                                                    className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors leading-snug block mb-2"
                                                                                >
                                                                                    {item.headline}
                                                                                </a>
                                                                            ) : (
                                                                                <h4
                                                                                    onMouseEnter={() => {
                                                                                        if (pinnedItem) return;
                                                                                        setHoveredItem(item);
                                                                                    }}
                                                                                    onMouseLeave={() => {
                                                                                        if (pinnedItem) return;
                                                                                        setHoveredItem(null);
                                                                                    }}
                                                                                    onClick={() => {
                                                                                        setPinnedItem((prev: any) => (prev?.headline === item.headline ? null : item));
                                                                                        setHoveredItem(item);
                                                                                    }}
                                                                                    className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white leading-snug block mb-2 cursor-pointer"
                                                                                >
                                                                                    {item.headline}
                                                                                </h4>
                                                                            )}
                                                                            {item.summary && (
                                                                                <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-base">
                                                                                    {item.summary}
                                                                                </p>
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
                            <div className="hidden 2xl:block fixed right-10 top-[20%] z-[90] w-80">
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
                                                        {pinnedItem && (
                                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                                                                <Pin className="w-3 h-3" /> Pinned
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-snug line-clamp-3">
                                                        {activeDigestItem.headline}
                                                    </p>
                                                </div>
                                                {pinnedItem && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPinnedItem(null)}
                                                        className="shrink-0 p-2 rounded-md hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
                                                        aria-label="unpin"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
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
