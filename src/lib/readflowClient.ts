import { prisma } from '@/lib/db';

export type ReadflowCleanedArticle = {
    title: string;
    url: string;
    sourceName: string;
    content: string;
    publishedAt: string;
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
    const serverUrl = await getReadflowServerUrl();
    const url = new URL('/api/rss/daily-reports/articles/cleaned', serverUrl);
    url.searchParams.set('start', start);
    url.searchParams.set('end', end);

    const res = await authedFetch(url, { method: 'GET' }, true);
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Readflow get cleaned articles failed: ${res.status} ${text}`);
    }

    const data: unknown = await res.json();
    if (!isRecord(data)) return [];
    const articles = data.articles;
    return Array.isArray(articles) ? (articles as ReadflowCleanedArticle[]) : [];
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
