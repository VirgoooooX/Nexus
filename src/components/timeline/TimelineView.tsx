'use client';

import { TimelineNode } from './TimelineNode';

interface TimelineViewProps {
    nodes: Array<{
        id: string;
        date: string;
        headline: string;
        content: string;
        sources: string;
    }>;
    variant?: 'event' | 'digest';
}

export function TimelineView({ nodes, variant = 'event' }: TimelineViewProps) {
    if (!nodes || nodes.length === 0) {
        return (
            <div className="py-16 text-center">
                <p className="text-stone-400 text-sm">
                    时间线尚处空白。等待 AI 引擎收录第一个信息节点。
                </p>
            </div>
        );
    }

    return (
        <div className="relative">
            {nodes.map((node, idx) => (
                <TimelineNode
                    key={node.id}
                    node={node}
                    isFirst={idx === 0}
                    isLast={idx === nodes.length - 1}
                    variant={variant}
                />
            ))}
        </div>
    );
}
