'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    ScrollText, Pause, Play, Trash2, Filter, Search, ChevronDown,
    AlertCircle, AlertTriangle, Info, RefreshCw, X
} from 'lucide-react';

interface LogEntry {
    id: string;
    level: 'info' | 'warn' | 'error';
    source: string;
    message: string;
    meta?: Record<string, unknown> | string | null;
    createdAt: string;
}

const SOURCE_LABELS: Record<string, string> = {
    digest: '日报生成',
    orchestrator: '编排引擎',
    push: '消息推送',
    cron: '定时任务',
    settings: '设置变更',
    system: '系统',
};

const SOURCE_COLORS: Record<string, string> = {
    digest: 'bg-blue-100 text-blue-700',
    orchestrator: 'bg-purple-100 text-purple-700',
    push: 'bg-emerald-100 text-emerald-700',
    cron: 'bg-amber-100 text-amber-700',
    settings: 'bg-stone-100 text-stone-600',
    system: 'bg-stone-100 text-stone-600',
};

const LEVEL_CONFIG = {
    info: { icon: Info, color: 'text-stone-400', bg: '' },
    warn: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50/50' },
    error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50/50' },
};

function formatTime(iso: string) {
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch {
        return '';
    }
}

function formatDate(iso: string) {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    } catch {
        return '';
    }
}

export function SystemLogPanel() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [filterSource, setFilterSource] = useState<string>('all');
    const [filterLevel, setFilterLevel] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const isPausedRef = useRef(false);
    const logsRef = useRef<LogEntry[]>([]);

    // Keep refs in sync
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { logsRef.current = logs; }, [logs]);

    // Auto-scroll
    useEffect(() => {
        if (!isPaused && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isPaused]);

    // SSE connection
    useEffect(() => {
        let eventSource: EventSource | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout>;

        function connect() {
            console.log('[SystemLogPanel] Connecting to SSE stream...');
            eventSource = new EventSource('/api/logs/stream');

            eventSource.onopen = () => {
                console.log('[SystemLogPanel] SSE connection opened.');
                setIsConnected(true);
            };

            eventSource.onmessage = (event) => {
                if (event.data === '') return; // keep-alive
                try {
                    const entry = JSON.parse(event.data) as LogEntry;
                    setLogs(prev => {
                        if (prev.some(log => log.id === entry.id)) {
                            return prev;
                        }
                        const next = [...prev, entry];
                        if (next.length > 1000) return next.slice(-1000);
                        return next;
                    });
                } catch (e) {
                    console.warn('[SystemLogPanel] Failed to parse log entry:', event.data, e);
                }
            };

            eventSource.onerror = (error) => {
                console.error('[SystemLogPanel] SSE connection error:', error);
                setIsConnected(false);
                eventSource?.close();
                // Reconnect after 3s
                reconnectTimer = setTimeout(connect, 3000);
            };
        }

        connect();

        return () => {
            eventSource?.close();
            clearTimeout(reconnectTimer);
        };
    }, []);

    // Filter logs
    const filteredLogs = logs.filter(log => {
        if (filterSource !== 'all' && log.source !== filterSource) return false;
        if (filterLevel !== 'all' && log.level !== filterLevel) return false;
        if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    // Clear logs
    const handleClear = useCallback(async () => {
        if (!confirm('确定要清除所有系统日志吗？此操作不可撤销。')) return;
        try {
            await fetch('/api/logs', { method: 'DELETE' });
            setLogs([]);
        } catch { /* ignore */ }
    }, []);

    const activeFilters = (filterSource !== 'all' ? 1 : 0) + (filterLevel !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="font-serif text-lg font-bold text-stone-900">系统日志</h2>
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        {isConnected ? '实时连接中' : '断开连接'}
                    </div>
                    <span className="text-xs text-stone-400">{filteredLogs.length} 条日志</span>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowFilters(!showFilters)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${showFilters || activeFilters > 0 ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}>
                        <Filter className="w-3 h-3" />
                        筛选{activeFilters > 0 && ` (${activeFilters})`}
                    </button>
                    <button type="button" onClick={() => setIsPaused(!isPaused)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${isPaused ? 'bg-amber-100 text-amber-700' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}>
                        {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        {isPaused ? '继续' : '暂停'}
                    </button>
                    <button type="button" onClick={handleClear}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3 h-3" /> 清除
                    </button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg border border-stone-100 animate-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-stone-500">来源</span>
                        <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}
                            className="text-xs bg-white border border-stone-200 rounded-md px-2 py-1 text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-300">
                            <option value="all">全部</option>
                            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-stone-500">级别</span>
                        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}
                            className="text-xs bg-white border border-stone-200 rounded-md px-2 py-1 text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-300">
                            <option value="all">全部</option>
                            <option value="info">Info</option>
                            <option value="warn">Warning</option>
                            <option value="error">Error</option>
                        </select>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                        <Search className="w-3 h-3 text-stone-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索日志内容..."
                            className="flex-1 text-xs bg-white border border-stone-200 rounded-md px-2 py-1 text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-300"
                        />
                    </div>
                    {activeFilters > 0 && (
                        <button type="button" onClick={() => { setFilterSource('all'); setFilterLevel('all'); setSearchQuery(''); }}
                            className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1 rounded hover:bg-stone-100 transition-colors">
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            )}

            {/* Log Stream */}
            <div
                ref={scrollRef}
                className="bg-stone-900 rounded-lg border border-stone-800 overflow-auto font-mono text-xs leading-relaxed"
                style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}
            >
                {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-stone-500 gap-2">
                        <ScrollText className="w-8 h-8 text-stone-600" />
                        <span>等待日志...</span>
                    </div>
                ) : (
                    <table className="w-full">
                        <tbody>
                            {filteredLogs.map((log) => {
                                const levelCfg = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info;
                                const LevelIcon = levelCfg.icon;
                                const sourceColor = SOURCE_COLORS[log.source] || SOURCE_COLORS.system;
                                let metaDisplay = '';
                                if (log.meta) {
                                    try {
                                        const obj = typeof log.meta === 'string' ? JSON.parse(log.meta) : log.meta;
                                        metaDisplay = JSON.stringify(obj);
                                    } catch {
                                        metaDisplay = String(log.meta);
                                    }
                                }

                                return (
                                    <tr key={log.id} className={`border-b border-stone-800/50 hover:bg-stone-800/50 transition-colors ${levelCfg.bg}`}>
                                        <td className="px-3 py-1.5 text-stone-500 whitespace-nowrap align-top w-0">
                                            {formatDate(log.createdAt)} {formatTime(log.createdAt)}
                                        </td>
                                        <td className="px-1 py-1.5 align-top w-0">
                                            <LevelIcon className={`w-3.5 h-3.5 ${levelCfg.color}`} />
                                        </td>
                                        <td className="px-1 py-1.5 align-top w-0 whitespace-nowrap">
                                            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${sourceColor}`}>
                                                {SOURCE_LABELS[log.source] || log.source}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-stone-200 break-all align-top">
                                            {log.message}
                                            {metaDisplay && (
                                                <span className="text-stone-500 ml-2">{metaDisplay}</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pause indicator */}
            {isPaused && (
                <div className="flex items-center justify-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg py-2 border border-amber-200">
                    <Pause className="w-3 h-3" />
                    日志实时滚动已暂停，点击「继续」恢复
                </div>
            )}
        </div>
    );
}
