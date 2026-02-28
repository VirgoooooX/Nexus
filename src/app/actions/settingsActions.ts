'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { DAILY_NEWS_PROMPT } from '@/services/ai/prompts'; // We will use this as default
import { updateConfigSync, ReadflowConfigSync } from '@/lib/readflowClient';

// Default category order
const DEFAULT_CATEGORIES = ['时政要闻', '前沿科技', '人工智能', '智能硬件', '商业财经', '社会民生', '娱乐文化', '电子游戏', '体育赛事'];

type ReadflowSourceConfig = { url: string; groupName: string; enabled: boolean };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function parseReadflowSources(raw: string | null | undefined): ReadflowSourceConfig[] {
    if (!raw) return [];
    try {
        const v = JSON.parse(raw);
        if (!Array.isArray(v)) return [];
        return v
            .map((x) => ({
                url: typeof x?.url === 'string' ? x.url : '',
                groupName: typeof x?.groupName === 'string' ? x.groupName : '',
                enabled: Boolean(x?.enabled)
            }))
            .filter((x) => x.url && x.groupName);
    } catch {
        return [];
    }
}

function normalizeUrl(raw: string): string {
    try {
        const u = new URL(raw.trim());
        u.hash = '';
        return u.toString().replace(/\/$/, '');
    } catch {
        return raw.trim();
    }
}

async function syncReadflowConfig(sources: ReadflowSourceConfig[]) {
    const managed = sources.map((s) => ({ ...s, url: normalizeUrl(s.url), groupName: s.groupName.trim() }));
    const managedUrlSet = new Set(managed.map((s) => s.url).filter(Boolean));
    const enabledSources = managed.filter((s) => s.enabled && s.url && s.groupName);
    const enabledGroupNames = Array.from(new Set(enabledSources.map((s) => s.groupName)));

    await updateConfigSync((config: ReadflowConfigSync) => {
        const next: ReadflowConfigSync = { ...config };
        const existingSources = Array.isArray(next.sources) ? next.sources : [];
        next.sources = existingSources.filter((s) => !managedUrlSet.has(normalizeUrl(s.url)));
        next.sources.push(...enabledSources.map((s) => ({ url: s.url, groupName: s.groupName })));

        const settings = next.settings && typeof next.settings === 'object' ? next.settings : {};
        const dailyRaw = isRecord(settings) ? (settings['dailyReportSettings'] as unknown) : undefined;
        const daily = isRecord(dailyRaw) ? dailyRaw : {};
        const existingNames = Array.isArray(daily['groupNames'])
            ? (daily['groupNames'] as unknown[]).filter((n) => typeof n === 'string')
            : [];
        const mergedNames = Array.from(new Set([...existingNames, ...enabledGroupNames]));
        (settings as Record<string, unknown>)['dailyReportSettings'] = { ...daily, enabled: true, groupNames: mergedNames };
        next.settings = settings;

        return next;
    });
}

export async function getSettings() {
    // Fetch settings from DB
    const [categoriesConfig, promptConfig, layoutConfig, readflowUrlConfig, readflowSourcesConfig] = await Promise.all([
        prisma.systemConfig.findUnique({ where: { key: 'CATEGORIES_ORDER' } }),
        prisma.systemConfig.findUnique({ where: { key: 'DAILY_NEWS_PROMPT_TEMPLATE' } }),
        prisma.systemConfig.findUnique({ where: { key: 'DEFAULT_LAYOUT' } }),
        prisma.systemConfig.findUnique({ where: { key: 'READFLOW_SERVER_URL' } }),
        prisma.systemConfig.findUnique({ where: { key: 'READFLOW_SOURCES' } })
    ]);

    let categoriesOrder = [...DEFAULT_CATEGORIES];
    if (categoriesConfig?.value) {
        try {
            const savedCategories = JSON.parse(categoriesConfig.value) as string[];
            // Filter out any garbage or removed categories, then append any new categories 
            // from DEFAULT_CATEGORIES that aren't in the saved list yet.
            const validSaved = savedCategories.filter(c => DEFAULT_CATEGORIES.includes(c));
            const newAdditions = DEFAULT_CATEGORIES.filter(c => !savedCategories.includes(c));
            categoriesOrder = [...validSaved, ...newAdditions];
        } catch (e) {
            console.error('Failed to parse categories order from DB:', e);
        }
    }

    // Pass an empty string so the default function just returns the raw template
    // We'll replace the placeholder dynamically during actual execution
    const defaultPromptTemp = DAILY_NEWS_PROMPT('${date}');
    const promptTemplate = promptConfig?.value || defaultPromptTemp;

    const defaultLayout = layoutConfig?.value || 'masonry';
    const readflowServerUrl = readflowUrlConfig?.value || process.env.READFLOW_SERVER_URL || 'https://rsscloud.198909.xyz:37891/';
    const readflowSources = parseReadflowSources(readflowSourcesConfig?.value);

    return {
        categoriesOrder,
        promptTemplate,
        defaultLayout,
        readflowServerUrl,
        readflowSources
    };
}

export async function saveSettings(
    categoriesOrder: string[],
    promptTemplate: string,
    defaultLayout: string,
    readflowServerUrl: string,
    readflowSources: ReadflowSourceConfig[]
) {
    try {
        await prisma.systemConfig.upsert({
            where: { key: 'CATEGORIES_ORDER' },
            create: { id: 'CATEGORIES_ORDER', key: 'CATEGORIES_ORDER', value: JSON.stringify(categoriesOrder) },
            update: { value: JSON.stringify(categoriesOrder) }
        });

        await prisma.systemConfig.upsert({
            where: { key: 'DAILY_NEWS_PROMPT_TEMPLATE' },
            create: { id: 'DAILY_NEWS_PROMPT_TEMPLATE', key: 'DAILY_NEWS_PROMPT_TEMPLATE', value: promptTemplate },
            update: { value: promptTemplate }
        });

        await prisma.systemConfig.upsert({
            where: { key: 'DEFAULT_LAYOUT' },
            create: { id: 'DEFAULT_LAYOUT', key: 'DEFAULT_LAYOUT', value: defaultLayout },
            update: { value: defaultLayout }
        });

        await prisma.systemConfig.upsert({
            where: { key: 'READFLOW_SERVER_URL' },
            create: { id: 'READFLOW_SERVER_URL', key: 'READFLOW_SERVER_URL', value: readflowServerUrl },
            update: { value: readflowServerUrl }
        });

        await prisma.systemConfig.upsert({
            where: { key: 'READFLOW_SOURCES' },
            create: { id: 'READFLOW_SOURCES', key: 'READFLOW_SOURCES', value: JSON.stringify(readflowSources) },
            update: { value: JSON.stringify(readflowSources) }
        });

        await syncReadflowConfig(readflowSources);

        revalidatePath('/');
        return { success: true };
    } catch (err: any) {
        console.error('[saveSettings] Failed to save settings:', err);
        return { success: false, error: String(err) };
    }
}

export async function updateSettings(partialSettings: { categoriesOrder?: string[], promptTemplate?: string, defaultLayout?: string }) {
    try {
        if (partialSettings.categoriesOrder) {
            await prisma.systemConfig.upsert({
                where: { key: 'CATEGORIES_ORDER' },
                create: { id: 'CATEGORIES_ORDER', key: 'CATEGORIES_ORDER', value: JSON.stringify(partialSettings.categoriesOrder) },
                update: { value: JSON.stringify(partialSettings.categoriesOrder) }
            });
        }

        if (partialSettings.promptTemplate !== undefined) {
            await prisma.systemConfig.upsert({
                where: { key: 'DAILY_NEWS_PROMPT_TEMPLATE' },
                create: { id: 'DAILY_NEWS_PROMPT_TEMPLATE', key: 'DAILY_NEWS_PROMPT_TEMPLATE', value: partialSettings.promptTemplate },
                update: { value: partialSettings.promptTemplate }
            });
        }

        if (partialSettings.defaultLayout) {
            await prisma.systemConfig.upsert({
                where: { key: 'DEFAULT_LAYOUT' },
                create: { id: 'DEFAULT_LAYOUT', key: 'DEFAULT_LAYOUT', value: partialSettings.defaultLayout },
                update: { value: partialSettings.defaultLayout }
            });
        }

        revalidatePath('/');
        return { success: true };
    } catch (err: any) {
        console.error('[updateSettings] Failed to update settings:', err);
        return { success: false, error: String(err) };
    }
}
