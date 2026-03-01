"use client";

import React from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { getIconComponent } from "./IconHelper";

type AccentKey = "blue" | "violet" | "amber" | "emerald" | "cyan" | "rose" | "slate" | "orange" | "indigo" | "lime";
type AccentConfig = {
    border: string;
    topBar: string;
    dot: string;
    icon: string;
    iconRing: string;
    rule: string;
    badge: string;
    badgeDot: string;
    pointer: string;
    pointerText: string;
    track: string;
    linkHover: string;
    microLink: string;
};

const ACCENTS: Record<AccentKey, AccentConfig> = {
    blue: {
        border: "bg-gradient-to-br from-blue-200/80 via-white to-cyan-200/60 dark:from-blue-900/35 dark:via-stone-950 dark:to-cyan-900/25",
        topBar: "bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 dark:from-blue-500 dark:via-sky-400 dark:to-cyan-300",
        dot: "bg-blue-600 dark:bg-blue-400",
        icon: "bg-blue-50 text-blue-700 dark:bg-blue-950/45 dark:text-blue-200",
        iconRing: "ring-blue-200/70 dark:ring-blue-900/45",
        rule: "bg-gradient-to-r from-transparent via-blue-200/70 to-transparent dark:via-blue-900/35",
        badge: "bg-blue-50/70 text-blue-700 border-blue-200/60 dark:bg-blue-950/35 dark:text-blue-200 dark:border-blue-900/45",
        badgeDot: "bg-blue-600 dark:bg-blue-400",
        pointer: "bg-blue-600 dark:bg-blue-400 shadow-[0_0_12px_rgba(37,99,235,0.45)]",
        pointerText: "text-blue-700 dark:text-blue-200",
        track: "bg-blue-200/60 dark:bg-blue-900/30",
        linkHover: "group-hover/item:text-blue-700 dark:group-hover/item:text-blue-200",
        microLink: "group-hover/item:text-blue-600 dark:group-hover/item:text-blue-300",
    },
    violet: {
        border: "bg-gradient-to-br from-violet-200/75 via-white to-fuchsia-200/55 dark:from-violet-900/35 dark:via-stone-950 dark:to-fuchsia-900/25",
        topBar: "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-400 dark:from-violet-500 dark:via-fuchsia-400 dark:to-pink-300",
        dot: "bg-violet-600 dark:bg-violet-400",
        icon: "bg-violet-50 text-violet-700 dark:bg-violet-950/45 dark:text-violet-200",
        iconRing: "ring-violet-200/70 dark:ring-violet-900/45",
        rule: "bg-gradient-to-r from-transparent via-violet-200/70 to-transparent dark:via-violet-900/35",
        badge: "bg-violet-50/70 text-violet-700 border-violet-200/60 dark:bg-violet-950/35 dark:text-violet-200 dark:border-violet-900/45",
        badgeDot: "bg-violet-600 dark:bg-violet-400",
        pointer: "bg-violet-600 dark:bg-violet-400 shadow-[0_0_12px_rgba(124,58,237,0.45)]",
        pointerText: "text-violet-700 dark:text-violet-200",
        track: "bg-violet-200/60 dark:bg-violet-900/30",
        linkHover: "group-hover/item:text-violet-700 dark:group-hover/item:text-violet-200",
        microLink: "group-hover/item:text-violet-600 dark:group-hover/item:text-violet-300",
    },
    amber: {
        border: "bg-gradient-to-br from-amber-200/70 via-white to-orange-200/55 dark:from-amber-900/35 dark:via-stone-950 dark:to-orange-900/25",
        topBar: "bg-gradient-to-r from-amber-600 via-orange-500 to-rose-400 dark:from-amber-500 dark:via-orange-400 dark:to-rose-300",
        dot: "bg-amber-600 dark:bg-amber-400",
        icon: "bg-amber-50 text-amber-800 dark:bg-amber-950/45 dark:text-amber-200",
        iconRing: "ring-amber-200/70 dark:ring-amber-900/45",
        rule: "bg-gradient-to-r from-transparent via-amber-200/70 to-transparent dark:via-amber-900/35",
        badge: "bg-amber-50/70 text-amber-800 border-amber-200/60 dark:bg-amber-950/35 dark:text-amber-200 dark:border-amber-900/45",
        badgeDot: "bg-amber-600 dark:bg-amber-400",
        pointer: "bg-amber-600 dark:bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.45)]",
        pointerText: "text-amber-800 dark:text-amber-200",
        track: "bg-amber-200/60 dark:bg-amber-900/30",
        linkHover: "group-hover/item:text-amber-800 dark:group-hover/item:text-amber-200",
        microLink: "group-hover/item:text-amber-700 dark:group-hover/item:text-amber-300",
    },
    emerald: {
        border: "bg-gradient-to-br from-emerald-200/70 via-white to-teal-200/55 dark:from-emerald-900/35 dark:via-stone-950 dark:to-teal-900/25",
        topBar: "bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400 dark:from-emerald-500 dark:via-teal-400 dark:to-cyan-300",
        dot: "bg-emerald-600 dark:bg-emerald-400",
        icon: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-200",
        iconRing: "ring-emerald-200/70 dark:ring-emerald-900/45",
        rule: "bg-gradient-to-r from-transparent via-emerald-200/70 to-transparent dark:via-emerald-900/35",
        badge: "bg-emerald-50/70 text-emerald-800 border-emerald-200/60 dark:bg-emerald-950/35 dark:text-emerald-200 dark:border-emerald-900/45",
        badgeDot: "bg-emerald-600 dark:bg-emerald-400",
        pointer: "bg-emerald-600 dark:bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.45)]",
        pointerText: "text-emerald-800 dark:text-emerald-200",
        track: "bg-emerald-200/60 dark:bg-emerald-900/30",
        linkHover: "group-hover/item:text-emerald-800 dark:group-hover/item:text-emerald-200",
        microLink: "group-hover/item:text-emerald-700 dark:group-hover/item:text-emerald-300",
    },
    cyan: {
        border: "bg-gradient-to-br from-cyan-200/70 via-white to-sky-200/55 dark:from-cyan-900/35 dark:via-stone-950 dark:to-sky-900/25",
        topBar: "bg-gradient-to-r from-cyan-600 via-sky-500 to-blue-400 dark:from-cyan-500 dark:via-sky-400 dark:to-blue-300",
        dot: "bg-cyan-600 dark:bg-cyan-400",
        icon: "bg-cyan-50 text-cyan-800 dark:bg-cyan-950/45 dark:text-cyan-200",
        iconRing: "ring-cyan-200/70 dark:ring-cyan-900/45",
        rule: "bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent dark:via-cyan-900/35",
        badge: "bg-cyan-50/70 text-cyan-800 border-cyan-200/60 dark:bg-cyan-950/35 dark:text-cyan-200 dark:border-cyan-900/45",
        badgeDot: "bg-cyan-600 dark:bg-cyan-400",
        pointer: "bg-cyan-600 dark:bg-cyan-400 shadow-[0_0_12px_rgba(8,145,178,0.45)]",
        pointerText: "text-cyan-800 dark:text-cyan-200",
        track: "bg-cyan-200/60 dark:bg-cyan-900/30",
        linkHover: "group-hover/item:text-cyan-800 dark:group-hover/item:text-cyan-200",
        microLink: "group-hover/item:text-cyan-700 dark:group-hover/item:text-cyan-300",
    },
    rose: {
        border: "bg-gradient-to-br from-rose-200/70 via-white to-pink-200/55 dark:from-rose-900/35 dark:via-stone-950 dark:to-pink-900/25",
        topBar: "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-400 dark:from-rose-500 dark:via-pink-400 dark:to-amber-300",
        dot: "bg-rose-600 dark:bg-rose-400",
        icon: "bg-rose-50 text-rose-800 dark:bg-rose-950/45 dark:text-rose-200",
        iconRing: "ring-rose-200/70 dark:ring-rose-900/45",
        rule: "bg-gradient-to-r from-transparent via-rose-200/70 to-transparent dark:via-rose-900/35",
        badge: "bg-rose-50/70 text-rose-800 border-rose-200/60 dark:bg-rose-950/35 dark:text-rose-200 dark:border-rose-900/45",
        badgeDot: "bg-rose-600 dark:bg-rose-400",
        pointer: "bg-rose-600 dark:bg-rose-400 shadow-[0_0_12px_rgba(225,29,72,0.45)]",
        pointerText: "text-rose-800 dark:text-rose-200",
        track: "bg-rose-200/60 dark:bg-rose-900/30",
        linkHover: "group-hover/item:text-rose-800 dark:group-hover/item:text-rose-200",
        microLink: "group-hover/item:text-rose-700 dark:group-hover/item:text-rose-300",
    },
    orange: {
        border: "bg-gradient-to-br from-orange-200/70 via-white to-amber-200/55 dark:from-orange-900/35 dark:via-stone-950 dark:to-amber-900/25",
        topBar: "bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 dark:from-orange-500 dark:via-amber-400 dark:to-yellow-300",
        dot: "bg-orange-600 dark:bg-orange-400",
        icon: "bg-orange-50 text-orange-800 dark:bg-orange-950/45 dark:text-orange-200",
        iconRing: "ring-orange-200/70 dark:ring-orange-900/45",
        rule: "bg-gradient-to-r from-transparent via-orange-200/70 to-transparent dark:via-orange-900/35",
        badge: "bg-orange-50/70 text-orange-800 border-orange-200/60 dark:bg-orange-950/35 dark:text-orange-200 dark:border-orange-900/45",
        badgeDot: "bg-orange-600 dark:bg-orange-400",
        pointer: "bg-orange-600 dark:bg-orange-400 shadow-[0_0_12px_rgba(234,88,12,0.45)]",
        pointerText: "text-orange-800 dark:text-orange-200",
        track: "bg-orange-200/60 dark:bg-orange-900/30",
        linkHover: "group-hover/item:text-orange-800 dark:group-hover/item:text-orange-200",
        microLink: "group-hover/item:text-orange-700 dark:group-hover/item:text-orange-300",
    },
    indigo: {
        border: "bg-gradient-to-br from-indigo-200/70 via-white to-blue-200/55 dark:from-indigo-900/35 dark:via-stone-950 dark:to-blue-900/25",
        topBar: "bg-gradient-to-r from-indigo-600 via-blue-500 to-sky-400 dark:from-indigo-500 dark:via-blue-400 dark:to-sky-300",
        dot: "bg-indigo-600 dark:bg-indigo-400",
        icon: "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/45 dark:text-indigo-200",
        iconRing: "ring-indigo-200/70 dark:ring-indigo-900/45",
        rule: "bg-gradient-to-r from-transparent via-indigo-200/70 to-transparent dark:via-indigo-900/35",
        badge: "bg-indigo-50/70 text-indigo-800 border-indigo-200/60 dark:bg-indigo-950/35 dark:text-indigo-200 dark:border-indigo-900/45",
        badgeDot: "bg-indigo-600 dark:bg-indigo-400",
        pointer: "bg-indigo-600 dark:bg-indigo-400 shadow-[0_0_12px_rgba(79,70,229,0.45)]",
        pointerText: "text-indigo-800 dark:text-indigo-200",
        track: "bg-indigo-200/60 dark:bg-indigo-900/30",
        linkHover: "group-hover/item:text-indigo-800 dark:group-hover/item:text-indigo-200",
        microLink: "group-hover/item:text-indigo-700 dark:group-hover/item:text-indigo-300",
    },
    lime: {
        border: "bg-gradient-to-br from-lime-200/70 via-white to-green-200/55 dark:from-lime-900/35 dark:via-stone-950 dark:to-green-900/25",
        topBar: "bg-gradient-to-r from-lime-600 via-green-500 to-emerald-400 dark:from-lime-500 dark:via-green-400 dark:to-emerald-300",
        dot: "bg-lime-600 dark:bg-lime-400",
        icon: "bg-lime-50 text-lime-800 dark:bg-lime-950/45 dark:text-lime-200",
        iconRing: "ring-lime-200/70 dark:ring-lime-900/45",
        rule: "bg-gradient-to-r from-transparent via-lime-200/70 to-transparent dark:via-lime-900/35",
        badge: "bg-lime-50/70 text-lime-800 border-lime-200/60 dark:bg-lime-950/35 dark:text-lime-200 dark:border-lime-900/45",
        badgeDot: "bg-lime-600 dark:bg-lime-400",
        pointer: "bg-lime-600 dark:bg-lime-400 shadow-[0_0_12px_rgba(101,163,13,0.45)]",
        pointerText: "text-lime-800 dark:text-lime-200",
        track: "bg-lime-200/60 dark:bg-lime-900/30",
        linkHover: "group-hover/item:text-lime-800 dark:group-hover/item:text-lime-200",
        microLink: "group-hover/item:text-lime-700 dark:group-hover/item:text-lime-300",
    },
    slate: {
        border: "bg-gradient-to-br from-stone-200/75 via-white to-stone-200/60 dark:from-stone-800/55 dark:via-stone-950 dark:to-stone-800/35",
        topBar: "bg-gradient-to-r from-stone-700 via-stone-600 to-stone-500 dark:from-stone-400 dark:via-stone-300 dark:to-stone-200",
        dot: "bg-stone-700 dark:bg-stone-300",
        icon: "bg-stone-100 text-stone-700 dark:bg-stone-900/60 dark:text-stone-200",
        iconRing: "ring-stone-200/70 dark:ring-stone-700/45",
        rule: "bg-gradient-to-r from-transparent via-stone-200/80 to-transparent dark:via-stone-800/45",
        badge: "bg-stone-100/70 text-stone-700 border-stone-200/60 dark:bg-stone-900/45 dark:text-stone-200 dark:border-stone-800/50",
        badgeDot: "bg-stone-700 dark:bg-stone-300",
        pointer: "bg-stone-700 dark:bg-stone-300 shadow-[0_0_12px_rgba(120,113,108,0.38)]",
        pointerText: "text-stone-700 dark:text-stone-200",
        track: "bg-stone-200/70 dark:bg-stone-800/40",
        linkHover: "group-hover/item:text-stone-900 dark:group-hover/item:text-stone-100",
        microLink: "group-hover/item:text-stone-700 dark:group-hover/item:text-stone-200",
    },
};

function accentKeyFromIcon(_iconName: string, catName?: string): AccentKey {
    const name = (catName || "").trim();

    // 严格匹配 9 大固定分类
    switch (name) {
        case "人工智能": return "blue";
        case "前沿科技": return "violet";
        case "商业财经": return "amber";
        case "智能硬件": return "cyan";
        case "时政要闻": return "slate";
        case "体育赛事": return "orange";
        case "电子游戏": return "rose";
        case "娱乐文化": return "indigo";
        case "社会民生": return "emerald";
        default: return "slate";
    }
}

export default function MasonryView({ data }: { data: any }) {
    const [scrollState, setScrollState] = React.useState<Record<number, { progress: number; isScrolling: boolean; canScroll: boolean }>>({});
    const timeoutRefs = React.useRef<Record<number, NodeJS.Timeout>>({});
    const containerRefs = React.useRef<Record<number, HTMLDivElement | null>>({});

    const handleScroll = (e: React.UIEvent<HTMLDivElement>, idx: number) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        const maxScroll = scrollHeight - clientHeight;
        const progress = maxScroll > 0 ? Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100)) : 0;
        const canScroll = maxScroll > 0;

        setScrollState(prev => ({
            ...prev,
            [idx]: { progress, isScrolling: true, canScroll }
        }));

        if (timeoutRefs.current[idx]) clearTimeout(timeoutRefs.current[idx]);

        timeoutRefs.current[idx] = setTimeout(() => {
            setScrollState(prev => ({
                ...prev,
                [idx]: { progress: prev[idx]?.progress || 0, isScrolling: false, canScroll: prev[idx]?.canScroll || false }
            }));
        }, 150);
    };

    React.useEffect(() => {
        // Check initial scrollability for each card
        const initialScrollState: Record<number, { progress: number; isScrolling: boolean; canScroll: boolean }> = {};
        Object.keys(containerRefs.current).forEach(key => {
            const idx = parseInt(key);
            const el = containerRefs.current[idx];
            if (el) {
                const canScroll = el.scrollHeight > el.clientHeight;
                initialScrollState[idx] = { progress: 0, isScrolling: false, canScroll };
            }
        });
        setScrollState(initialScrollState);
    }, [data.categories]);

    if (!data?.categories || data.categories.length === 0) {
        return <div className="p-8 text-center text-stone-500">正在生成卡片视图数据...</div>;
    }

    return (
        <div className="relative w-full">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_12%_0%,rgba(245,158,11,0.10),transparent_60%),radial-gradient(1000px_circle_at_88%_18%,rgba(59,130,246,0.10),transparent_55%),radial-gradient(820px_circle_at_50%_100%,rgba(16,185,129,0.08),transparent_55%)] dark:bg-[radial-gradient(900px_circle_at_12%_0%,rgba(245,158,11,0.10),transparent_60%),radial-gradient(1000px_circle_at_88%_18%,rgba(59,130,246,0.14),transparent_55%),radial-gradient(820px_circle_at_50%_100%,rgba(16,185,129,0.10),transparent_55%)]" />
            {/* Header Content */}
            <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-6 h-1 bg-stone-900 dark:bg-stone-100"></span>
                    <h2 className="text-[12px] font-black uppercase tracking-[0.32em] text-stone-500 dark:text-stone-400">Masonry Digest</h2>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-stone-900 dark:text-white tracking-tight leading-[1.06] mb-6 font-serif">
                    Global Digest{" "}
                    <span className="text-lg sm:text-xl text-stone-800 dark:text-stone-100 bg-white/70 dark:bg-stone-900/60 px-3 py-1 rounded-full font-black ml-2 align-middle border border-stone-200/70 dark:border-stone-800/60 backdrop-blur">
                        {data.date}
                    </span>
                </h1>
                <p className="text-stone-600 dark:text-stone-300 text-lg leading-relaxed max-w-4xl font-medium">
                    {data.overallSummary}
                </p>
            </div>

            {/* Masonry Layout grid */}
            <div className="columns-1 md:columns-2 xl:columns-3 [column-gap:2rem]">
                {data.categories.map((cat: any, idx: number) => {
                    const Icon = getIconComponent(cat.icon);
                    const state = scrollState[idx] || { progress: 0, isScrolling: false, canScroll: false };
                    const isScrolling = state.isScrolling;
                    const accent = ACCENTS[accentKeyFromIcon(cat.icon, cat.name)];

                    return (
                        <div
                            key={idx}
                            className="break-inside-avoid mb-8"
                        >
                            <div className={`group relative overflow-hidden rounded-[28px] p-px ${accent.border} shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)] dark:shadow-[0_18px_60px_-40px_rgba(0,0,0,0.85)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_80px_-48px_rgba(15,23,42,0.60)] dark:hover:shadow-[0_30px_90px_-55px_rgba(0,0,0,0.95)]`}>
                                <div className="relative flex flex-col h-[500px] sm:h-[60vh] rounded-[27px] bg-card text-card-foreground overflow-hidden">
                                    <div className={`absolute inset-x-0 top-0 h-[3px] ${accent.topBar}`} />

                                    <div className="shrink-0 p-6 md:p-8 pb-4 border-b border-border/60 bg-gradient-to-b from-card/95 to-card/75 dark:from-card/90 dark:to-card/70 backdrop-blur-md z-10 flex items-center gap-4">
                                        <div className={`relative w-12 h-12 rounded-full ${accent.icon} flex items-center justify-center ring-1 ${accent.iconRing} shadow-[0_12px_34px_-20px_rgba(15,23,42,0.40)] transition-colors`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
                                                <span className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-500 dark:text-stone-400">
                                                    Section
                                                </span>
                                            </div>
                                            <h3 className="mt-1 text-[22px] font-black text-stone-950 dark:text-white tracking-tight font-serif truncate">
                                                {cat.name}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="absolute right-3 top-24 bottom-6 w-12 pointer-events-none z-20 transition-opacity duration-300 opacity-0 group-hover:opacity-100 flex justify-center">
                                        <div className={`absolute left-4 top-0 bottom-0 w-[1px] ${accent.track}`}></div>

                                        <div
                                            className="absolute left-4 flex items-center transition-all ease-out"
                                            style={{
                                                top: `${state.progress}%`,
                                                transform: `translate(0, -${state.progress}%)`,
                                                transitionDuration: isScrolling ? "50ms" : "300ms",
                                            }}
                                        >
                                            <div
                                                className={`h-[1px] transition-all ${isScrolling ? "w-4" : "w-2"} ${accent.pointer}`}
                                            ></div>
                                            <span className={`text-[9px] font-black ml-1.5 transition-opacity duration-200 ${accent.pointerText}`}>
                                                {Math.round(state.progress)}%
                                            </span>
                                        </div>
                                    </div>

                                    <div
                                        ref={el => { containerRefs.current[idx] = el; }}
                                        tabIndex={0}
                                        onScroll={(e) => handleScroll(e, idx)}
                                        className="p-6 md:p-8 pr-12 space-y-10 flex-1 overflow-y-auto overscroll-contain scroll-smooth outline-none relative z-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                    >
                                        {cat.themes?.map((theme: any, tIdx: number) => (
                                            <div key={tIdx} className="space-y-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex-1 h-px ${accent.rule}`}></div>
                                                    <h4 className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.26em] border shadow-[0_2px_12px_-6px_rgba(15,23,42,0.20)] dark:shadow-[0_2px_14px_-7px_rgba(0,0,0,0.55)] flex items-center gap-2 ${accent.badge}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${accent.badgeDot} animate-pulse`}></span>
                                                        {theme.themeName}
                                                    </h4>
                                                    <div className={`flex-1 h-px ${accent.rule}`}></div>
                                                </div>
                                                <div className="space-y-6">
                                                    {theme.items?.map((item: any, iIdx: number) => {
                                                        const citations = Array.isArray(item?.citations)
                                                            ? item.citations
                                                            : item?.url
                                                                ? [{ source: item?.source || '来源', url: item.url }]
                                                                : [];
                                                        return (
                                                            <a
                                                                href={item?.url || citations[0]?.url || '#'}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                key={iIdx}
                                                                className="block group/item"
                                                            >
                                                                <h5 className={`text-[17px] font-bold text-stone-950 dark:text-stone-100 leading-snug transition-colors ${accent.linkHover}`}>
                                                                    {item.headline}
                                                                </h5>
                                                                {item.summary && (
                                                                    <p className="text-sm text-stone-600 dark:text-stone-400 mt-2 line-clamp-2 leading-relaxed">
                                                                        {item.summary}
                                                                    </p>
                                                                )}
                                                                {citations.length > 0 && (
                                                                    <div className="mt-2 text-[11px] font-bold text-stone-500 dark:text-stone-400">
                                                                        （
                                                                        {citations.slice(0, 3).map((c: any, cIdx: number) => (
                                                                            <React.Fragment key={`${c?.url || cIdx}`}>
                                                                                <span className="underline underline-offset-2">{c?.source || '来源'}</span>
                                                                                {cIdx < Math.min(2, citations.length - 1) ? '，' : ''}
                                                                            </React.Fragment>
                                                                        ))}
                                                                        ）
                                                                    </div>
                                                                )}
                                                                <div className={`flex items-center gap-1 mt-2 text-[11px] font-black uppercase tracking-wider text-stone-400 transition-colors ${accent.microLink}`}>
                                                                    <span>打开引用</span>
                                                                    <ArrowUpRight className="w-3 h-3" />
                                                                </div>
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}

                                        {!cat.themes && cat.items && (
                                            <div className="space-y-5">
                                                {cat.items?.map((item: any, iIdx: number) => {
                                                    const citations = Array.isArray(item?.citations)
                                                        ? item.citations
                                                        : item?.url
                                                            ? [{ source: item?.source || '来源', url: item.url }]
                                                            : [];
                                                    return (
                                                        <a
                                                            href={item?.url || citations[0]?.url || '#'}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            key={iIdx}
                                                            className="block group/item"
                                                        >
                                                            <h5 className={`text-[17px] font-bold text-stone-950 dark:text-stone-100 leading-snug transition-colors ${accent.linkHover}`}>
                                                                {item.headline}
                                                            </h5>
                                                            {item.summary && (
                                                                <p className="text-sm text-stone-600 dark:text-stone-400 mt-2 line-clamp-2 leading-relaxed">
                                                                    {item.summary}
                                                                </p>
                                                            )}
                                                            {citations.length > 0 && (
                                                                <div className="mt-2 text-[11px] font-bold text-stone-500 dark:text-stone-400">
                                                                    （
                                                                    {citations.slice(0, 3).map((c: any, cIdx: number) => (
                                                                        <React.Fragment key={`${c?.url || cIdx}`}>
                                                                            <span className="underline underline-offset-2">{c?.source || '来源'}</span>
                                                                            {cIdx < Math.min(2, citations.length - 1) ? '，' : ''}
                                                                        </React.Fragment>
                                                                    ))}
                                                                    ）
                                                                </div>
                                                            )}
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className={`absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card via-card/85 to-transparent pointer-events-none z-10 flex items-end justify-center pb-6 transition-opacity duration-500 overflow-hidden ${state.canScroll ? 'opacity-100' : 'opacity-0'}`}>
                                        <div 
                                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/70 backdrop-blur border border-border/60 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.35)] dark:shadow-[0_10px_34px_-22px_rgba(0,0,0,0.65)] transition-all duration-500 ${state.progress > 90 ? 'translate-y-12 opacity-0' : 'translate-y-0 opacity-100'}`}
                                        >
                                            <span className="text-[10px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                                                Scroll for more
                                            </span>
                                            <ChevronDown className="w-3 h-3 text-stone-400 dark:text-stone-500 animate-bounce" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
