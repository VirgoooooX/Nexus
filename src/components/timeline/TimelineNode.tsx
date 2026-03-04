'use client';

import Link from 'next/link';
import { Calendar, ExternalLink as LinkIcon } from 'lucide-react';

interface TimelineNodeProps {
    node: {
        id: string;
        date: string;
        headline: string;
        content: string;
        sources: string;
    };
    isFirst: boolean;
    isLast: boolean;
    variant?: 'event' | 'digest';
}

export function TimelineNode({ node, isFirst, isLast, variant = 'event' }: TimelineNodeProps) {
    let sourcesList: string[] = [];
    try {
        sourcesList = JSON.parse(node.sources);
    } catch (e) { }

    const dense = variant === 'digest';
    const visibleSources = dense ? sourcesList.slice(0, 3) : sourcesList;

    return (
        <div className={`relative group ${dense ? 'pl-6' : 'pl-8'}`}>
            {/* Vertical Line */}
            <div
                className={`absolute top-0 bottom-0 w-px bg-stone-200 dark:bg-stone-800 ${dense ? 'left-[5px]' : 'left-[7px]'} ${isFirst ? 'top-3' : ''} ${isLast ? 'bottom-1/2' : ''}`}
            />

            {/* Dot */}
            <div
                className={`absolute top-3 rounded-full border-2 bg-white dark:bg-stone-950 transition-colors z-10 ${dense ? 'left-[-1px] w-[11px] h-[11px] border-stone-300 dark:border-stone-700 group-hover:border-blue-600 dark:group-hover:border-blue-400' : 'left-0 w-[15px] h-[15px] border-stone-300 group-hover:border-stone-900'}`}
            />

            {/* Content */}
            <article className={`${dense ? 'pb-6 pt-0' : 'pb-8 pt-0.5'}`}>
                <time className={`${dense ? 'text-[10px] font-black uppercase tracking-[0.28em] text-stone-500 dark:text-stone-500' : 'text-xs font-mono text-stone-400 tracking-wider'} flex items-center gap-1.5 mb-2`}>
                    <Calendar className={`${dense ? 'w-3 h-3 text-stone-400 dark:text-stone-600' : 'w-3 h-3'}`} />
                    <span className="tabular-nums">{node.date}</span>
                </time>
                <h3 className={`${dense ? 'font-sans font-semibold text-[14px] leading-[1.65] text-stone-900 dark:text-stone-100 group-hover:text-blue-700 dark:group-hover:text-blue-300' : 'font-serif font-bold text-stone-900 text-lg leading-snug group-hover:text-stone-600'} transition-colors mb-2`}>
                    {node.headline}
                </h3>
                <p className={`${dense ? 'text-[13px] leading-[1.7] text-stone-600 dark:text-stone-400 line-clamp-3' : 'text-stone-600 text-sm leading-relaxed'} mb-3`}>
                    {node.content}
                </p>

                {visibleSources && visibleSources.length > 0 && (
                    <div className={`flex flex-wrap ${dense ? 'gap-1' : 'gap-1.5'}`}>
                        {visibleSources.map((src, idx) => {
                            try {
                                const url = new URL(src);
                                return (
                                    <Link
                                        key={idx}
                                        href={src}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`${dense ? 'text-[10px] text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 border-stone-200/70 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 px-2 py-0.5 rounded-md' : 'text-[11px] text-stone-400 hover:text-stone-900 border-stone-200 hover:border-stone-400 px-2 py-0.5 rounded'} inline-flex items-center border transition-colors`}
                                        title={src}
                                    >
                                        <LinkIcon className={`${dense ? 'w-2.5 h-2.5 mr-1 shrink-0 opacity-70' : 'w-2.5 h-2.5 mr-1 shrink-0'}`} />
                                        <span className={`${dense ? 'truncate max-w-[96px]' : 'truncate max-w-[120px]'}`}>{url.hostname.replace('www.', '')}</span>
                                    </Link>
                                )
                            } catch {
                                return null;
                            }
                        })}
                    </div>
                )}
            </article>
        </div>
    );
}
