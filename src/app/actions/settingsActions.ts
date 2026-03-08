'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { DEFAULT_PROMPT_CONFIG, type PromptConfig } from '@/lib/promptConfig';
import { buildPromptFromConfig } from '@/lib/buildPromptFromConfig';

// Default category order
const DEFAULT_CATEGORIES = ['时政要闻', '前沿科技', '人工智能', '智能硬件', '商业财经', '社会民生', '娱乐文化', '电子游戏', '体育赛事'];

export async function getSettings() {
    // Fetch settings from DB
    const [categoriesConfig, promptConfig, layoutConfig, readflowUrlConfig, scheduleEnabledConfig, scheduleTimeConfig, promptConfigDb] = await Promise.all([
        prisma.systemConfig.findUnique({ where: { key: 'CATEGORIES_ORDER' } }),
        prisma.systemConfig.findUnique({ where: { key: 'DAILY_NEWS_PROMPT_TEMPLATE' } }),
        prisma.systemConfig.findUnique({ where: { key: 'DEFAULT_LAYOUT' } }),
        prisma.systemConfig.findUnique({ where: { key: 'READFLOW_SERVER_URL' } }),
        prisma.systemConfig.findUnique({ where: { key: 'DAILY_DIGEST_SCHEDULE_ENABLED' } }),
        prisma.systemConfig.findUnique({ where: { key: 'DAILY_DIGEST_SCHEDULE_TIME' } }),
        prisma.systemConfig.findUnique({ where: { key: 'PROMPT_CONFIG' } })
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

    // Return empty string when no custom override exists.
    // The AI service (AISearchService.buildDailyNewsPrompt) already falls back
    // to the hardcoded DAILY_NEWS_PROMPT when the DB has no value.
    const promptTemplate = promptConfig?.value || '';

    const defaultLayout = layoutConfig?.value || 'masonry';
    const readflowServerUrl = readflowUrlConfig?.value || process.env.READFLOW_SERVER_URL || 'https://rsscloud.198909.xyz:37891/';
    const digestScheduleEnabled = scheduleEnabledConfig?.value === 'true';
    const digestScheduleTime = scheduleTimeConfig?.value || '08:30';

    let promptCfg: PromptConfig = DEFAULT_PROMPT_CONFIG;
    if (promptConfigDb?.value) {
        try {
            promptCfg = JSON.parse(promptConfigDb.value) as PromptConfig;
        } catch (e) {
            console.error('Failed to parse PROMPT_CONFIG from DB:', e);
        }
    }

    return {
        categoriesOrder,
        promptTemplate,
        defaultLayout,
        readflowServerUrl,
        digestScheduleEnabled,
        digestScheduleTime,
        promptCfg
    };
}

export async function saveSettings(
    categoriesOrder: string[],
    promptTemplate: string,
    defaultLayout: string,
    readflowServerUrl: string,
    digestScheduleEnabled: boolean,
    digestScheduleTime: string,
    promptCfg?: PromptConfig
) {
    try {
        const time = typeof digestScheduleTime === 'string' ? digestScheduleTime.trim() : '';
        const m = /^(\d{2}):(\d{2})$/.exec(time);
        if (!m) throw new Error('定时生成时间格式必须为 HH:mm');
        const hh = Number(m[1]);
        const mm = Number(m[2]);
        if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
            throw new Error('定时生成时间不合法');
        }

        await prisma.systemConfig.upsert({
            where: { key: 'CATEGORIES_ORDER' },
            create: { id: 'CATEGORIES_ORDER', key: 'CATEGORIES_ORDER', value: JSON.stringify(categoriesOrder) },
            update: { value: JSON.stringify(categoriesOrder) }
        });

        const trimmedPrompt = promptTemplate.trim();
        if (trimmedPrompt === '') {
            // If the prompt is completely empty or just spaces/newlines, delete the override so it falls back to the default
            try {
                await prisma.systemConfig.delete({ where: { key: 'DAILY_NEWS_PROMPT_TEMPLATE' } });
            } catch (e) {
                // Ignore error if it didn't exist
            }
        } else {
            await prisma.systemConfig.upsert({
                where: { key: 'DAILY_NEWS_PROMPT_TEMPLATE' },
                create: { id: 'DAILY_NEWS_PROMPT_TEMPLATE', key: 'DAILY_NEWS_PROMPT_TEMPLATE', value: trimmedPrompt },
                update: { value: trimmedPrompt }
            });
        }

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
            where: { key: 'DAILY_DIGEST_SCHEDULE_ENABLED' },
            create: { id: 'DAILY_DIGEST_SCHEDULE_ENABLED', key: 'DAILY_DIGEST_SCHEDULE_ENABLED', value: digestScheduleEnabled ? 'true' : 'false' },
            update: { value: digestScheduleEnabled ? 'true' : 'false' }
        });

        await prisma.systemConfig.upsert({
            where: { key: 'DAILY_DIGEST_SCHEDULE_TIME' },
            create: { id: 'DAILY_DIGEST_SCHEDULE_TIME', key: 'DAILY_DIGEST_SCHEDULE_TIME', value: time },
            update: { value: time }
        });

        // Save prompt config if provided; also regenerate the prompt template from it
        if (promptCfg) {
            await prisma.systemConfig.upsert({
                where: { key: 'PROMPT_CONFIG' },
                create: { id: 'PROMPT_CONFIG', key: 'PROMPT_CONFIG', value: JSON.stringify(promptCfg) },
                update: { value: JSON.stringify(promptCfg) }
            });
            const generatedPrompt = buildPromptFromConfig(promptCfg, '${date}');
            await prisma.systemConfig.upsert({
                where: { key: 'DAILY_NEWS_PROMPT_TEMPLATE' },
                create: { id: 'DAILY_NEWS_PROMPT_TEMPLATE', key: 'DAILY_NEWS_PROMPT_TEMPLATE', value: generatedPrompt },
                update: { value: generatedPrompt }
            });
        }

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
            const trimmedPrompt = partialSettings.promptTemplate.trim();
            if (trimmedPrompt === '') {
                try {
                    await prisma.systemConfig.delete({ where: { key: 'DAILY_NEWS_PROMPT_TEMPLATE' } });
                } catch (e) {
                    // Ignore error if it didn't exist
                }
            } else {
                await prisma.systemConfig.upsert({
                    where: { key: 'DAILY_NEWS_PROMPT_TEMPLATE' },
                    create: { id: 'DAILY_NEWS_PROMPT_TEMPLATE', key: 'DAILY_NEWS_PROMPT_TEMPLATE', value: trimmedPrompt },
                    update: { value: trimmedPrompt }
                });
            }
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
