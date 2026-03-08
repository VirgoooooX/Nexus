'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  readflowCreateGroup,
  readflowLoadGroups,
  readflowLoadPreferences,
  readflowLoadPublicFeeds,
  readflowLoadSources,
  readflowLoginBot,
  readflowSaveDailyReportGroups,
  readflowSaveSubscriptionsAndGroups,
} from '@/app/admin/actions/readflowAdminActions';
import type { ReadflowPublicFeed, ReadflowUserGroup, ReadflowUserSource } from '@/lib/readflowClient';
import { AlertCircle, CheckCircle2, FolderPlus, RefreshCcw, Rss, Save, Search, X } from 'lucide-react';

export function ReadflowAdminPanel({ readflowServerUrl }: { readflowServerUrl: string }) {
  const [connectedUserId, setConnectedUserId] = useState<string | null>(null);
  const [groups, setGroups] = useState<ReadflowUserGroup[]>([]);
  const [sources, setSources] = useState<ReadflowUserSource[]>([]);
  const [publicFeeds, setPublicFeeds] = useState<ReadflowPublicFeed[]>([]);
  const [dailyGroupNames, setDailyGroupNames] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [activeTab, setActiveTab] = useState<'sources' | 'groups'>('sources');
  const [editableServerUrl, setEditableServerUrl] = useState(readflowServerUrl);
  const [isUrlDirty, setIsUrlDirty] = useState(false);
  const [isSavingUrl, setIsSavingUrl] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await readflowLoginBot();
        if (cancelled) return;
        if (res.success) {
          setConnectedUserId(res.userId);
          const [g, s, p, pref] = await Promise.all([
            readflowLoadGroups(),
            readflowLoadSources(),
            readflowLoadPublicFeeds(),
            readflowLoadPreferences(),
          ]);
          if (cancelled) return;
          setGroups(g);
          setSources(s);
          setPublicFeeds(p);
          const names = Array.isArray(pref?.dailyReportSettings?.groupNames) ? pref.dailyReportSettings!.groupNames! : [];
          setDailyGroupNames(names.map((n) => String(n || '').trim()).filter(Boolean));
        }
      } catch (e) {
        if (!cancelled) console.error('[ReadflowAdminPanel] auto-login failed:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const groupOptions = useMemo(() => {
    return [...groups].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
  }, [groups]);

  const subscribedUrlSet = useMemo(() => new Set(sources.map((s) => String(s.url || '').trim())), [sources]);

  const filteredPublicFeeds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return publicFeeds;
    return publicFeeds.filter((f) => {
      const name = String(f.name || '').toLowerCase();
      const url = String(f.url || '').toLowerCase();
      const cat = String(f.category || '').toLowerCase();
      return name.includes(q) || url.includes(q) || cat.includes(q);
    });
  }, [publicFeeds, search]);

  async function loadAll() {
    setPending(true);
    setError('');
    try {
      const [g, s, p, pref] = await Promise.all([
        readflowLoadGroups(),
        readflowLoadSources(),
        readflowLoadPublicFeeds(),
        readflowLoadPreferences(),
      ]);
      setGroups(g);
      setSources(s);
      setPublicFeeds(p);
      const names = Array.isArray(pref?.dailyReportSettings?.groupNames) ? pref.dailyReportSettings!.groupNames! : [];
      setDailyGroupNames(names.map((n) => String(n || '').trim()).filter(Boolean));
      setStatus('idle');
    } catch (e: unknown) {
      setStatus('error');
      setError(String(e));
    } finally {
      setPending(false);
    }
  }

  async function onLogin() {
    setPending(true);
    setError('');
    try {
      const res = await readflowLoginBot();
      if (!res.success) throw new Error('登录失败');
      setConnectedUserId(res.userId);
      await loadAll();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e: unknown) {
      setStatus('error');
      setError(String(e));
    } finally {
      setPending(false);
    }
  }

  async function onCreateGroup() {
    if (!newGroupName.trim()) return;
    setPending(true);
    setError('');
    try {
      const res = await readflowCreateGroup(newGroupName);
      if (!res.success) throw new Error(res.error || '创建分组失败');
      setNewGroupName('');
      const g = await readflowLoadGroups();
      setGroups(g);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e: unknown) {
      setStatus('error');
      setError(String(e));
    } finally {
      setPending(false);
    }
  }

  function subscribeFromPool(feed: ReadflowPublicFeed) {
    const url = String(feed.url || '').trim();
    if (!url || subscribedUrlSet.has(url)) return;
    if (groupOptions.length === 0) {
      setStatus('error');
      setError('请先创建至少一个分组，再进行订阅');
      return;
    }
    const defaultGroupId = groupOptions[0]?.id ?? null;
    setSources((prev) => [
      ...prev,
      { url, name: feed.name || null, category: feed.category || null, description: feed.description || null, groupId: defaultGroupId, isActive: true },
    ]);
  }

  function unsubscribe(url: string) {
    const u = String(url || '').trim();
    if (!u) return;
    setSources((prev) => prev.filter((s) => String(s.url || '').trim() !== u));
  }

  async function onSaveSources() {
    setPending(true);
    setError('');
    try {
      const payload = sources.map((s) => ({
        url: String(s.url || '').trim(),
        name: s.name ?? null,
        category: s.category ?? null,
        description: s.description ?? null,
        groupId: typeof s.groupId === 'number' ? s.groupId : null,
        isActive: s.isActive !== false,
      }));
      const res = await readflowSaveSubscriptionsAndGroups(payload);
      if (!res.success) throw new Error('保存失败');
      await loadAll();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e: unknown) {
      setStatus('error');
      setError(String(e));
    } finally {
      setPending(false);
    }
  }

  async function onSaveDailyGroups() {
    setPending(true);
    setError('');
    try {
      const res = await readflowSaveDailyReportGroups(dailyGroupNames);
      if (!res.success) throw new Error('保存失败');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e: unknown) {
      setStatus('error');
      setError(String(e));
    } finally {
      setPending(false);
    }
  }

  async function onSaveUrl() {
    if (!editableServerUrl.trim()) return;
    setIsSavingUrl(true);
    try {
      const { updateSettings } = await import('@/app/actions/settingsActions');
      const res = await updateSettings({ readflowServerUrl: editableServerUrl.trim() });
      if (res.success) {
        setIsUrlDirty(false);
        setStatus('success');
        setTimeout(() => setStatus('idle'), 2500);
      } else {
        throw new Error('URL 保存失败');
      }
    } catch (e: unknown) {
      setStatus('error');
      setError(String(e));
    } finally {
      setIsSavingUrl(false);
    }
  }

  return (
    <div className="space-y-8 pb-24">

      {/* ═══════════════════ HEADER BAR ═══════════════════ */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-stone-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center">
            <Rss className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">Readflow 数据源</h1>
            <div className="flex items-center gap-2 mt-1">
              <input
                value={editableServerUrl}
                onChange={(e) => {
                  setEditableServerUrl(e.target.value);
                  setIsUrlDirty(true);
                }}
                className="text-xs text-stone-600 font-mono bg-stone-100 border border-stone-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-stone-300 w-full max-w-sm"
                placeholder="Server URL..."
              />
              {isUrlDirty && (
                <button
                  onClick={onSaveUrl}
                  disabled={isSavingUrl}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 whitespace-nowrap"
                >
                  {isSavingUrl ? '保存中...' : '保存 URL'}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-600">
            <div className={`w-2 h-2 rounded-full ${connectedUserId ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`} />
            {connectedUserId ? `Bot: ${connectedUserId}` : '未连接'}
          </div>
          {!connectedUserId && (
            <button type="button" onClick={onLogin} disabled={pending}
              className="text-xs font-bold text-white bg-stone-900 hover:bg-stone-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
              {pending ? '连接中…' : '授权登录'}
            </button>
          )}
          <button type="button" onClick={loadAll} disabled={!connectedUserId || pending}
            className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-40">
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ═══════════════════ STATUS TOASTS ═══════════════════ */}
      {status === 'success' && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" /> 操作成功
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
          <AlertCircle className="w-4 h-4" /> {error || '操作失败'}
        </div>
      )}

      {/* ═══════════════════ TAB NAVIGATION ═══════════════════ */}
      <nav className="flex gap-1 bg-stone-100 p-1 rounded-lg w-fit">
        <button type="button" onClick={() => setActiveTab('sources')}
          className={`px-5 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'sources' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
          订阅源管理
        </button>
        <button type="button" onClick={() => setActiveTab('groups')}
          className={`px-5 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'groups' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
          分组与日报
        </button>
      </nav>

      {/* ═══════════════════ TAB: 订阅源管理 ═══════════════════ */}
      {activeTab === 'sources' && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

          {/* LEFT: Public Pool (3/5) */}
          <div className="xl:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-stone-900">公共源池</h2>
              <span className="text-xs font-medium text-stone-400">{filteredPublicFeeds.length} 个可用</span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-stone-200 rounded-lg bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent placeholder:text-stone-400 transition-shadow"
                placeholder="搜索名称、URL 或分类…" disabled={!connectedUserId || pending}
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Feed List */}
            <div className="border border-stone-200 rounded-lg overflow-hidden bg-white">
              <div className="max-h-[calc(100vh-350px)] overflow-auto divide-y divide-stone-100">
                {filteredPublicFeeds.map((f, i) => {
                  const url = String(f.url || '').trim();
                  const subscribed = subscribedUrlSet.has(url);
                  return (
                    <div key={url || i} className="px-4 py-3.5 flex items-center gap-4 hover:bg-stone-50 transition-colors group">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-stone-900 truncate">{f.name || '未命名源'}</div>
                        <div className="text-[11px] text-stone-400 mt-0.5 truncate font-mono">{url}</div>
                        <div className="flex gap-2 mt-1.5">
                          <span className="text-[10px] font-medium bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">{f.category || '未分类'}</span>
                          <span className="text-[10px] font-medium bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">{f.subscriberCount ?? 0} 人订阅</span>
                        </div>
                      </div>
                      <button type="button" disabled={!connectedUserId || pending}
                        onClick={() => subscribed ? unsubscribe(url) : subscribeFromPool(f)}
                        className={`shrink-0 text-xs font-bold px-4 py-2 rounded-lg border transition-all ${subscribed
                          ? 'border-stone-300 text-stone-600 hover:bg-stone-100 hover:border-stone-400'
                          : 'border-stone-900 bg-stone-900 text-white hover:bg-stone-700'
                          } disabled:opacity-40`}>
                        {subscribed ? '已订阅' : '订阅'}
                      </button>
                    </div>
                  );
                })}
                {filteredPublicFeeds.length === 0 && (
                  <div className="py-16 text-center text-sm text-stone-400">无匹配结果</div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Subscribed Sources (2/5) */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-stone-900">已订阅</h2>
              <span className="text-xs font-medium text-stone-400">{sources.length} 个源</span>
            </div>

            <div className="border border-stone-200 rounded-lg overflow-hidden bg-white">
              <div className="max-h-[calc(100vh-400px)] overflow-auto divide-y divide-stone-100">
                {sources.map((s, idx) => {
                  const url = String(s.url || '').trim();
                  return (
                    <div key={url || idx} className="px-4 py-3 space-y-2 hover:bg-stone-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-stone-900 truncate">{s.name || url}</div>
                          <div className="text-[10px] font-mono text-stone-400 mt-0.5 truncate">{url}</div>
                        </div>
                        <button type="button" onClick={() => unsubscribe(url)} disabled={!connectedUserId || pending}
                          className="shrink-0 text-[10px] font-bold text-stone-400 hover:text-red-600 transition-colors disabled:opacity-40 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <select
                        value={typeof s.groupId === 'number' ? String(s.groupId) : ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSources((prev) => prev.map((x) =>
                            String(x.url || '').trim() === url ? { ...x, groupId: v ? Number(v) : null } : x
                          ));
                        }}
                        disabled={!connectedUserId || pending}
                        className="w-full px-3 py-1.5 border border-stone-200 rounded-md bg-stone-50 text-stone-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-stone-300 cursor-pointer">
                        <option value="">未分组</option>
                        {groupOptions.map((g) => (
                          <option key={g.id} value={String(g.id)}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
                {sources.length === 0 && (
                  <div className="py-16 text-center text-sm text-stone-400">从左侧公共池中添加订阅</div>
                )}
              </div>
            </div>

            <button type="button" onClick={onSaveSources} disabled={!connectedUserId || pending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 text-white text-sm font-bold rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" /> 保存订阅与分组
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════ TAB: 分组与日报 ═══════════════════ */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT: Group Management */}
          <div className="space-y-4">
            <h2 className="font-serif text-lg font-bold text-stone-900">分组管理</h2>

            <div className="flex items-stretch gap-2">
              <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg bg-white text-sm text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-400"
                placeholder="新分组名称…" disabled={!connectedUserId || pending}
              />
              <button type="button" onClick={onCreateGroup} disabled={!connectedUserId || pending || !newGroupName.trim()}
                className="shrink-0 flex items-center gap-1.5 px-5 py-2.5 bg-stone-900 text-white text-sm font-bold rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-40">
                <FolderPlus className="w-4 h-4" /> 新建
              </button>
            </div>

            <div className="border border-stone-200 rounded-lg overflow-hidden bg-white">
              <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-100 text-[11px] font-bold tracking-wider uppercase text-stone-500">
                现有分组
              </div>
              <div className="divide-y divide-stone-100 max-h-[400px] overflow-auto">
                {groupOptions.map((g) => (
                  <div key={g.id} className="px-4 py-3 flex items-center justify-between hover:bg-stone-50 transition-colors">
                    <span className="text-sm font-bold text-stone-900">{g.name}</span>
                    <code className="text-[10px] text-stone-400">ID: {g.id}</code>
                  </div>
                ))}
                {groupOptions.length === 0 && (
                  <div className="py-12 text-center text-sm text-stone-400">暂无分组</div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Daily Digest Config */}
          <div className="space-y-4">
            <h2 className="font-serif text-lg font-bold text-stone-900">日报选取范围</h2>
            <p className="text-xs text-stone-500 -mt-2">勾选用于生成每日新闻日报的分组。</p>

            <div className="border border-stone-200 rounded-lg overflow-hidden bg-white">
              <div className="p-4 space-y-1 max-h-[400px] overflow-auto">
                {groupOptions.map((g) => {
                  const checked = dailyGroupNames.includes(g.name);
                  return (
                    <label key={g.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-stone-100' : 'hover:bg-stone-50'}`}>
                      <input type="checkbox" checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? Array.from(new Set([...dailyGroupNames, g.name]))
                            : dailyGroupNames.filter((n) => n !== g.name);
                          setDailyGroupNames(next);
                        }}
                        disabled={!connectedUserId || pending}
                        className="h-4 w-4 accent-stone-900 rounded"
                      />
                      <span className={`text-sm font-medium ${checked ? 'text-stone-900 font-bold' : 'text-stone-600'}`}>{g.name}</span>
                    </label>
                  );
                })}
                {groupOptions.length === 0 && (
                  <div className="py-12 text-center text-sm text-stone-400">请先创建分组</div>
                )}
              </div>
            </div>

            <button type="button" onClick={onSaveDailyGroups} disabled={!connectedUserId || pending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 text-white text-sm font-bold rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" /> 保存日报分组
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
