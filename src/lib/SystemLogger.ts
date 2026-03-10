// ═══════════ System Logger ═══════════
// Unified logging service: console + DB + SSE broadcast

import { prisma } from '@/lib/db';

export type LogLevel = 'info' | 'warn' | 'error';
export type LogSource = 'digest' | 'orchestrator' | 'push' | 'cron' | 'settings' | 'system';

export interface LogEntry {
    id: string;
    level: LogLevel;
    source: LogSource;
    message: string;
    meta?: Record<string, unknown>;
    createdAt: string; // ISO string
}

// ─── Ring Buffer ───
const BUFFER_SIZE = 500;
const buffer: LogEntry[] = [];

// ─── SSE Subscribers ───
type SseController = ReadableStreamDefaultController<Uint8Array>;
const subscribers = new Set<SseController>();

function broadcast(entry: LogEntry) {
    const data = `data: ${JSON.stringify(entry)}\n\n`;
    const encoded = new TextEncoder().encode(data);
    for (const controller of subscribers) {
        try {
            controller.enqueue(encoded);
        } catch {
            subscribers.delete(controller);
        }
    }
}

// ─── Core write function ───
function write(level: LogLevel, source: LogSource, message: string, meta?: Record<string, unknown>) {
    const now = new Date();
    const entry: LogEntry = {
        id: crypto.randomUUID(),
        level,
        source,
        message,
        meta,
        createdAt: now.toISOString(),
    };

    // 1. Console output (preserve original behavior)
    const prefix = `[${source.toUpperCase()}]`;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    if (level === 'error') {
        console.error(`${prefix} ${message}${metaStr}`);
    } else if (level === 'warn') {
        console.warn(`${prefix} ${message}${metaStr}`);
    } else {
        console.log(`${prefix} ${message}${metaStr}`);
    }

    // 2. Ring buffer
    buffer.push(entry);
    if (buffer.length > BUFFER_SIZE) {
        buffer.shift();
    }

    // 3. SSE broadcast
    broadcast(entry);

    // 4. DB persist (fire-and-forget)
    prisma.systemLog.create({
        data: {
            level,
            source,
            message,
            meta: meta ? JSON.stringify(meta) : null,
        },
    }).catch((err: unknown) => {
        console.error('[SystemLogger] Failed to persist log:', err);
    });
}

// ─── Public API ───
export const syslog = {
    info: (source: LogSource, message: string, meta?: Record<string, unknown>) => write('info', source, message, meta),
    warn: (source: LogSource, message: string, meta?: Record<string, unknown>) => write('warn', source, message, meta),
    error: (source: LogSource, message: string, meta?: Record<string, unknown>) => write('error', source, message, meta),

    /** Get recent entries from ring buffer */
    getRecentEntries: (count = 50): LogEntry[] => {
        return buffer.slice(-count);
    },

    /** Subscribe an SSE controller */
    subscribe: (controller: SseController) => {
        subscribers.add(controller);
    },

    /** Unsubscribe an SSE controller */
    unsubscribe: (controller: SseController) => {
        subscribers.delete(controller);
    },
};
