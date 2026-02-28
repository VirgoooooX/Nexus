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
}

export function TimelineNode({ node, isFirst, isLast }: TimelineNodeProps) {
    let sourcesList: string[] = [];
    try {
        sourcesList = JSON.parse(node.sources);
    } catch (e) { }

    return (
        <div className="relative pl-8 group">
            {/* Vertical Line */}
            <div className={`absolute left-[7px] top-0 bottom-0 w-px bg-stone-200 ${isFirst ? 'top-3' : ''} ${isLast ? 'bottom-1/2' : ''}`} />

            {/* Dot */}
            <div className="absolute left-0 top-3 w-[15px] h-[15px] rounded-full border-2 border-stone-300 bg-white group-hover:border-stone-900 transition-colors z-10" />

            {/* Content */}
            <article className="pb-8 pt-0.5">
                <time className="text-xs font-mono text-stone-400 tracking-wider flex items-center gap-1.5 mb-2">
                    <Calendar className="w-3 h-3" />
                    {node.date}
                </time>
                <h3 className="font-serif font-bold text-stone-900 text-lg leading-snug mb-2 group-hover:text-stone-600 transition-colors">
                    {node.headline}
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed mb-3">
                    {node.content}
                </p>

                {sourcesList && sourcesList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {sourcesList.map((src, idx) => {
                            try {
                                const url = new URL(src);
                                return (
                                    <Link
                                        key={idx}
                                        href={src}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-[11px] text-stone-400 hover:text-stone-900 border border-stone-200 hover:border-stone-400 px-2 py-0.5 rounded transition-colors"
                                        title={src}
                                    >
                                        <LinkIcon className="w-2.5 h-2.5 mr-1 shrink-0" />
                                        <span className="truncate max-w-[120px]">{url.hostname.replace('www.', '')}</span>
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
