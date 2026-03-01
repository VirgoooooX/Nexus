'use server';

import {
  batchUpsertConfigSources,
  getBotUserId,
  getConfigGroups,
  getConfigSources,
  getPreferences,
  getPublicFeeds,
  type ReadflowPreferences,
  type ReadflowPublicFeed,
  type ReadflowUserGroup,
  type ReadflowUserSource,
  updatePreferences,
  upsertConfigGroup,
  clientSync,
} from '@/lib/readflowClient';

export async function readflowLoginBot() {
  const userId = await getBotUserId();
  return { success: true, userId };
}

export async function readflowLoadPublicFeeds(): Promise<ReadflowPublicFeed[]> {
  return getPublicFeeds();
}

export async function readflowLoadGroups(): Promise<ReadflowUserGroup[]> {
  return getConfigGroups();
}

export async function readflowCreateGroup(name: string) {
  const n = String(name || '').trim();
  if (!n) return { success: false, error: '分组名称不能为空' };
  await upsertConfigGroup({ name: n, sortOrder: 0 });
  return { success: true };
}

export async function readflowLoadSources(): Promise<ReadflowUserSource[]> {
  return getConfigSources();
}

export async function readflowLoadPreferences(): Promise<ReadflowPreferences> {
  return getPreferences();
}

export async function readflowSaveDailyReportGroups(groupNames: string[]) {
  const names = Array.isArray(groupNames)
    ? groupNames.map((n) => String(n || '').trim()).filter(Boolean)
    : [];
  await updatePreferences({ dailyReportSettings: { enabled: true, groupNames: names } });
  return { success: true };
}

export async function readflowSaveSubscriptionsAndGroups(sources: Array<{ url: string; name?: string | null; category?: string | null; description?: string | null; groupId?: number | null; isActive?: boolean }>) {
  const normalized = Array.isArray(sources)
    ? sources
        .map((s) => ({
          url: String(s?.url || '').trim(),
          name: s?.name ?? null,
          category: s?.category ?? null,
          description: s?.description ?? null,
          groupId: typeof s?.groupId === 'number' ? s.groupId : s?.groupId ?? null,
          isActive: s?.isActive !== false,
        }))
        .filter((s) => s.url)
    : [];

  const userId = await getBotUserId();
  const feeds = normalized.map((s) => ({
    url: s.url,
    name: s.name || undefined,
    category: s.category || undefined,
    description: s.description || undefined,
  }));

  await clientSync({ user: { id: userId }, feeds, replaceFeeds: true });
  await batchUpsertConfigSources(
    normalized.map((s) => ({
      url: s.url,
      name: s.name,
      category: s.category,
      description: s.description,
      groupId: s.groupId,
      isActive: s.isActive,
    }))
  );

  return { success: true };
}

export async function readflowUpsertSources(sources: ReadflowUserSource[]) {
  await batchUpsertConfigSources(sources);
  return { success: true };
}

