import { prisma } from '@/lib/db';
import { stripHtmlToText, truncateText } from '@/lib/utils';
import { cleanBatch } from '@/lib/cleanServer';

export type ReadflowCleanedArticle = {
    title: string;
    url: string;
    sourceName: string;
    content: string;
    publishedAt: string;
};

export type ReadflowRawArticle = {
    title: string;
    url: string;
    sourceName: string;
    content: string;
    publishedAt: string;
};

export type ReadflowPublicFeed = {
    id: string;
    url: string;
    name: string;
    category: string;
    description?: string;
    subscriberCount?: number;
    articleCount?: number;
    refreshCron?: string;
    refreshIntervalSeconds?: number;
};

export type ReadflowUserGroup = {
    id: number;
    name: string;
    sortOrder?: number;
    icon?: string | null;
    color?: string | null;
    [k: string]: unknown;
};

export type ReadflowUserSource = {
    url: string;
    name?: string | null;
    category?: string | null;
    description?: string | null;
    isActive?: boolean;
    groupId?: number | null;
    groupName?: string | null;
    [k: string]: unknown;
};

export type ReadflowPreferences = {
    dailyReportSettings?: {
        enabled?: boolean;
        scheduledTime?: string;
        groupNames?: string[];
        articleLimit?: number;
        [k: string]: unknown;
    };
    [k: string]: unknown;
};

export type ReadflowConfigSync = {
    settings: {
        dailyReportSettings?: {
            groupNames?: string[];
            enabled?: boolean;
        };
        [k: string]: unknown;
    };
    sources: Array<{ url: string; groupName: string }>;
    groups?: Array<{ id?: string; name?: string; [k: string]: unknown }>;
    filterRules?: unknown[];
    updatedAt?: string;
    [k: string]: unknown;
};

const DEFAULT_READFLOW_SERVER_URL = 'https://rsscloud.198909.xyz:37891/';

type AuthState = {
    token: string;
    expiresAtMs: number;
    userId: string;
};

let authState: AuthState | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getStringField(obj: Record<string, unknown>, key: string): string | null {
    const v = obj[key];
    return typeof v === 'string' ? v : null;
}

type ServerTokenConfig = {
    headerName: string;
    token: string;
};

async function getServerTokenConfig(): Promise<ServerTokenConfig | null> {
    const token = process.env.READFLOW_SERVER_TOKEN;
    if (!token) return null;
    const headerName = (process.env.READFLOW_SERVER_TOKEN_HEADER || 'X-Server-Token').trim();
    return { headerName, token };
}

async function getReadflowServerUrl(): Promise<string> {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'READFLOW_SERVER_URL' } });
    const raw = (config?.value || process.env.READFLOW_SERVER_URL || DEFAULT_READFLOW_SERVER_URL).trim();
    try {
        return new URL(raw).toString();
    } catch {
        return DEFAULT_READFLOW_SERVER_URL;
    }
}

async function loginBot(): Promise<AuthState> {
    const email = process.env.READFLOW_BOT_EMAIL;
    const password = process.env.READFLOW_BOT_PASSWORD;
    if (!email || !password) {
        throw new Error('Missing READFLOW_BOT_EMAIL or READFLOW_BOT_PASSWORD');
    }

    const serverUrl = await getReadflowServerUrl();
    const serverToken = await getServerTokenConfig();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (serverToken) headers[serverToken.headerName] = serverToken.token;
    const res = await fetch(new URL('/api/auth/login', serverUrl), {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Readflow login failed: ${res.status} ${text}`);
    }

    const data: unknown = await res.json();
    if (!isRecord(data)) throw new Error('Invalid Readflow login response');
    const token = getStringField(data, 'token');
    const success = data.success === true;
    const user = data.user;
    const userId = isRecord(user) ? getStringField(user, 'id') : null;
    if (!success || !token || !userId) {
        throw new Error('Invalid Readflow login response');
    }

    const expiresAtMs = Date.now() + 25 * 24 * 60 * 60 * 1000;
    authState = { token, userId, expiresAtMs };
    return authState;
}

async function getAuth(): Promise<AuthState> {
    if (authState && Date.now() < authState.expiresAtMs) return authState;
    return loginBot();
}

async function authedFetch(input: URL, init: RequestInit, retryOnAuthFailure: boolean): Promise<Response> {
    const { token } = await getAuth();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const serverToken = await getServerTokenConfig();
    if (serverToken) headers.set(serverToken.headerName, serverToken.token);

    const res = await fetch(input, { ...init, headers });
    if (res.status !== 401 || !retryOnAuthFailure) return res;

    authState = null;
    const { token: token2 } = await getAuth();
    headers.set('Authorization', `Bearer ${token2}`);
    if (serverToken) headers.set(serverToken.headerName, serverToken.token);
    return fetch(input, { ...init, headers });
}

export async function getConfigSync(): Promise<ReadflowConfigSync> {
    const serverUrl = await getReadflowServerUrl();
    const res = await authedFetch(new URL('/api/rss/sync/config', serverUrl), { method: 'GET' }, true);
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Readflow get config failed: ${res.status} ${text}`);
    }
    return res.json() as Promise<ReadflowConfigSync>;
}

export async function postConfigSync(config: ReadflowConfigSync): Promise<ReadflowConfigSync> {
    const serverUrl = await getReadflowServerUrl();
    const res = await authedFetch(
        new URL('/api/rss/sync/config', serverUrl),
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        },
        true
    );
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Readflow post config failed: ${res.status} ${text}`);
    }
    return res.json() as Promise<ReadflowConfigSync>;
}

function createEmptyConfigSync(): ReadflowConfigSync {
    return {
        settings: { dailyReportSettings: { groupNames: [], enabled: true } },
        sources: [],
        groups: [],
        filterRules: [],
        updatedAt: new Date().toISOString()
    };
}

export async function updateConfigSync(
    apply: (config: ReadflowConfigSync) => ReadflowConfigSync
): Promise<ReadflowConfigSync> {
    let current: ReadflowConfigSync;
    try {
        current = await getConfigSync();
    } catch (e: unknown) {
        const msg = String(e);
        if (msg.includes('404') && msg.includes('No remote config')) {
            await postConfigSync(createEmptyConfigSync());
            current = await getConfigSync();
        } else {
            throw e;
        }
    }
    const mutated = apply(current);
    mutated.updatedAt = new Date().toISOString();
    try {
        return await postConfigSync(mutated);
    } catch (e: unknown) {
        const msg = String(e);
        if (!msg.includes('409')) throw e;
    }

    current = await getConfigSync();
    const mutated2 = apply(current);
    mutated2.updatedAt = new Date().toISOString();
    return postConfigSync(mutated2);
}

export async function getCleanedArticles(start: string, end: string): Promise<ReadflowCleanedArticle[]> {
    const raw = await getRawArticles(start, end);
    const cleaned = await cleanBatch(
        raw.map((a) => ({
            url: a.url,
            title: a.title,
            sourceName: a.sourceName,
            publishedAt: a.publishedAt,
            content: a.content,
        }))
    );

    return raw.map((a, i) => {
        const r = cleaned[i]?.result;
        const url = r?.url || a.url;
        const title = r?.title || a.title;
        const contentInput = r?.content || a.content || a.title || '';
        return {
            ...a,
            url,
            title,
            content: truncateText(stripHtmlToText(contentInput), 1500),
        };
    });
}

export async function getRawArticles(start: string, end: string, userId?: string): Promise<ReadflowRawArticle[]> {
    const serverUrl = await getReadflowServerUrl();
    const url = new URL('/api/rss/daily-reports/articles/raw', serverUrl);
    url.searchParams.set('start', start);
    url.searchParams.set('end', end);
    if (typeof userId === 'string' && userId.trim()) {
        url.searchParams.set('userId', userId.trim());
    }

    const res = await authedFetch(url, { method: 'GET' }, true);
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Readflow get raw articles failed: ${res.status} ${text}`);
    }

    const data: unknown = await res.json();
    if (!isRecord(data)) return [];
    const articles = data.articles;
    return Array.isArray(articles) ? (articles as ReadflowRawArticle[]) : [];
}

export async function clientSync(payload: unknown): Promise<unknown> {
    const serverUrl = await getReadflowServerUrl();
    const res = await authedFetch(
        new URL('/api/rss/clientSync', serverUrl),
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
        true
    );
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Readflow clientSync failed: ${res.status} ${text}`);
    }
    return res.json();
}

export async function getBotUserId(): Promise<string> {
    const { userId } = await getAuth();
    return userId;
}

export async function getPublicFeeds(): Promise<ReadflowPublicFeed[]> {
    const serverUrl = await getReadflowServerUrl();
    const res = await fetch(new URL('/api/rss/public', serverUrl), { method: 'GET' });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Readflow get public feeds failed: ${res.status} ${text}`);
    }
    const data: unknown = await res.json();
    if (!isRecord(data)) return [];
    const feeds = data.feeds;
    return Array.isArray(feeds) ? (feeds as ReadflowPublicFeed[]) : [];
}

export async function getConfigGroups(): Promise<ReadflowUserGroup[]> {
    const serverUrl = await getReadflowServerUrl();
    const res = await authedFetch(new URL('/api/config/groups', serverUrl), { method: 'GET' }, true);
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Readflow get groups failed: ${res.status} ${text}`);
    }
    const data: unknown = await res.json();
    if (!isRecord(data)) return [];
    const groups = data.data;
    return Array.isArray(groups) ? (groups as ReadflowUserGroup[]) : [];
}

export async function upsertConfigGroup(input: { name: string; sortOrder: number; icon?: string | null; color?: string | null }) {
    const serverUrl = await getReadflowServerUrl();
    const res = await authedFetch(
        new URL('/api/config/groups', serverUrl),
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
        true
    );
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Readflow upsert group failed: ${res.status} ${text}`);
    }
    return res.json();
}

export async function getConfigSources(): Promise<ReadflowUserSource[]> {
    const serverUrl = await getReadflowServerUrl();
    const res = await authedFetch(new URL('/api/config/sources', serverUrl), { method: 'GET' }, true);
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Readflow get sources failed: ${res.status} ${text}`);
    }
    const data: unknown = await res.json();
    if (!isRecord(data)) return [];
    const sources = data.data;
    return Array.isArray(sources) ? (sources as ReadflowUserSource[]) : [];
}

export async function batchUpsertConfigSources(sources: ReadflowUserSource[]) {
    const serverUrl = await getReadflowServerUrl();
    const res = await authedFetch(
        new URL('/api/config/sources/batch', serverUrl),
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sources) },
        true
    );
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Readflow batch upsert sources failed: ${res.status} ${text}`);
    }
    return res.json();
}

export async function getPreferences(): Promise<ReadflowPreferences> {
    const serverUrl = await getReadflowServerUrl();
    const res = await authedFetch(new URL('/api/config/preferences', serverUrl), { method: 'GET' }, true);
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Readflow get preferences failed: ${res.status} ${text}`);
    }
    const data: unknown = await res.json();
    if (!isRecord(data)) return {};
    const prefs = data.data;
    return isRecord(prefs) ? (prefs as ReadflowPreferences) : {};
}

export async function updatePreferences(prefs: ReadflowPreferences) {
    const serverUrl = await getReadflowServerUrl();
    const res = await authedFetch(
        new URL('/api/config/preferences', serverUrl),
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prefs) },
        true
    );
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Readflow update preferences failed: ${res.status} ${text}`);
    }
    return res.json();
}
