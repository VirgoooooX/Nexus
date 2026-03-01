'use client';

import { useMemo, useState } from 'react';
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
import { AlertCircle, CheckCircle2, FolderPlus, RefreshCcw, Rss, Save, ShieldCheck } from 'lucide-react';

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
      setTimeout(() => setStatus('idle'), 1500);
    } catch (e: unknown) {
      setStatus('error');
      setError(String(e));
    } finally {
      setPending(false);
    }
  }

  async function onCreateGroup() {
    setPending(true);
    setError('');
    try {
      const res = await readflowCreateGroup(newGroupName);
      if (!res.success) throw new Error(res.error || '创建分组失败');
      setNewGroupName('');
      const g = await readflowLoadGroups();
      setGroups(g);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (e: unknown) {
      setStatus('error');
      setError(String(e));
    } finally {
      setPending(false);
    }
  }

  function subscribeFromPool(feed: ReadflowPublicFeed) {
    const url = String(feed.url || '').trim();
    if (!url) return;
    if (subscribedUrlSet.has(url)) return;
    if (groupOptions.length === 0) {
      setStatus('error');
      setError('请先创建至少一个分组，再进行订阅');
      return;
    }
    const defaultGroupId = groupOptions[0]?.id ?? null;
    setSources((prev) => [
      ...prev,
      {
        url,
        name: feed.name || null,
        category: feed.category || null,
        description: feed.description || null,
        groupId: defaultGroupId,
        isActive: true,
      },
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
      setTimeout(() => setStatus('idle'), 1500);
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
      setTimeout(() => setStatus('idle'), 1500);
    } catch (e: unknown) {
      setStatus('error');
      setError(String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between border-b-2 border-stone-900 pb-6">
        <div>
          <p className="text-xs tracking-[0.35em] uppercase text-stone-500 mb-2 font-medium">Nexus 管理后台</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-tight text-stone-900 flex items-center gap-3">
            <Rss className="w-8 h-8 text-stone-400" /> Readflow 管理
          </h1>
          <p className="text-sm text-stone-500 mt-2">服务端：{readflowServerUrl}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAll}
            disabled={!connectedUserId || pending}
            className="inline-flex items-center gap-2 text-xs font-bold text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCcw className="w-4 h-4" /> 刷新
          </button>
          <button
            type="button"
            onClick={onLogin}
            disabled={pending}
            className="inline-flex items-center gap-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" /> 登录 Bot
          </button>
        </div>
      </header>

      {status === 'success' ? (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium">
          <CheckCircle2 className="w-5 h-5" /> 操作成功
        </div>
      ) : null}
      {status === 'error' ? (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
          <AlertCircle className="w-5 h-5" /> {error || '操作失败'}
        </div>
      ) : null}

      <section className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-1">连接状态</h2>
          <p className="text-sm text-stone-500">使用环境变量配置的 bot 账号登录 Readflow。</p>
        </div>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-stone-700">
            {connectedUserId ? (
              <span className="font-bold">已登录：{connectedUserId}</span>
            ) : (
              <span className="font-bold text-stone-500">未登录</span>
            )}
          </div>
          <button
            type="button"
            onClick={onLogin}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" /> {pending ? '处理中...' : '登录到 Readflow'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-stone-100 bg-stone-50/50">
            <h2 className="font-serif text-xl font-bold text-stone-900 mb-1">分组管理</h2>
            <p className="text-sm text-stone-500">分组严格来自 Readflow 服务端，用于日报选源。</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1 px-4 py-3 border border-stone-200 rounded-lg bg-white text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-stone-400"
                placeholder="新分组名称，例如：新闻"
                disabled={!connectedUserId || pending}
              />
              <button
                type="button"
                onClick={onCreateGroup}
                disabled={!connectedUserId || pending}
                className="inline-flex items-center gap-2 px-4 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50"
              >
                <FolderPlus className="w-4 h-4" /> 新建
              </button>
            </div>

            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-stone-50 text-[11px] font-bold tracking-widest uppercase text-stone-500">
                现有分组
              </div>
              <div className="divide-y divide-stone-100">
                {groupOptions.map((g) => (
                  <div key={g.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="text-sm font-bold text-stone-900">{g.name}</div>
                    <div className="text-xs text-stone-500">id: {g.id}</div>
                  </div>
                ))}
                {groupOptions.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-stone-500">暂无分组</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-stone-100 bg-stone-50/50">
            <h2 className="font-serif text-xl font-bold text-stone-900 mb-1">日报选取分组</h2>
            <p className="text-sm text-stone-500">保存到 Readflow preferences.dailyReportSettings.groupNames。</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-stone-50 text-[11px] font-bold tracking-widest uppercase text-stone-500">
                选择用于生成日报的分组
              </div>
              <div className="p-4 space-y-2">
                {groupOptions.map((g) => {
                  const checked = dailyGroupNames.includes(g.name);
                  return (
                    <label key={g.id} className="flex items-center gap-3 text-sm text-stone-800">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? Array.from(new Set([...dailyGroupNames, g.name]))
                            : dailyGroupNames.filter((n) => n !== g.name);
                          setDailyGroupNames(next);
                        }}
                        disabled={!connectedUserId || pending}
                        className="h-4 w-4"
                      />
                      <span className="font-bold">{g.name}</span>
                    </label>
                  );
                })}
                {groupOptions.length === 0 ? (
                  <div className="text-sm text-stone-500">请先创建分组</div>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onSaveDailyGroups}
              disabled={!connectedUserId || pending}
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> 保存日报分组
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-stone-100 bg-stone-50/50">
            <h2 className="font-serif text-xl font-bold text-stone-900 mb-1">公共池</h2>
            <p className="text-sm text-stone-500">从公共池订阅/取消订阅（不会影响公共池本身）。</p>
          </div>
          <div className="p-6 space-y-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 border border-stone-200 rounded-lg bg-white text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="搜索名称 / URL / 分类"
              disabled={!connectedUserId || pending}
            />

            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-stone-50 text-[11px] font-bold tracking-widest uppercase text-stone-500">
                公共源列表
              </div>
              <div className="divide-y divide-stone-100 max-h-[520px] overflow-auto">
                {filteredPublicFeeds.map((f) => {
                  const url = String(f.url || '').trim();
                  const subscribed = subscribedUrlSet.has(url);
                  return (
                    <div key={url} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-stone-900 truncate">{f.name}</div>
                          <div className="text-xs text-stone-500 truncate">{url}</div>
                          <div className="text-[11px] text-stone-500 mt-1">
                            {f.category} · 订阅 {f.subscriberCount ?? 0}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!connectedUserId || pending}
                          onClick={() => (subscribed ? unsubscribe(url) : subscribeFromPool(f))}
                          className={`shrink-0 inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${
                            subscribed
                              ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                              : 'bg-stone-900 text-white hover:bg-stone-700'
                          }`}
                        >
                          {subscribed ? '取消订阅' : '订阅'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredPublicFeeds.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-stone-500">暂无数据</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-stone-100 bg-stone-50/50">
            <h2 className="font-serif text-xl font-bold text-stone-900 mb-1">已订阅源与分组</h2>
            <p className="text-sm text-stone-500">修改分组或取消订阅后，点击“保存订阅与分组”。</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 bg-stone-50 text-[11px] font-bold tracking-widest uppercase text-stone-500 px-4 py-3">
                <div className="col-span-6">URL</div>
                <div className="col-span-4">分组</div>
                <div className="col-span-2 text-right">操作</div>
              </div>
              <div className="divide-y divide-stone-100 max-h-[520px] overflow-auto">
                {sources.map((s, idx) => {
                  const url = String(s.url || '').trim();
                  return (
                    <div key={url || idx} className="grid grid-cols-12 items-center gap-2 px-4 py-3">
                      <div className="col-span-6 min-w-0">
                        <div className="text-sm font-bold text-stone-900 truncate">{s.name || url}</div>
                        <div className="text-xs text-stone-500 truncate">{url}</div>
                      </div>
                      <div className="col-span-4">
                        <select
                          value={typeof s.groupId === 'number' ? String(s.groupId) : ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSources((prev) =>
                              prev.map((x) =>
                                String(x.url || '').trim() === url
                                  ? { ...x, groupId: v ? Number(v) : null }
                                  : x
                              )
                            );
                          }}
                          disabled={!connectedUserId || pending}
                          className="w-full px-3 py-2 border border-stone-200 rounded-md bg-white text-stone-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-400"
                        >
                          <option value="">未分组</option>
                          {groupOptions.map((g) => (
                            <option key={g.id} value={String(g.id)}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => unsubscribe(url)}
                          disabled={!connectedUserId || pending}
                          className="text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          取消订阅
                        </button>
                      </div>
                    </div>
                  );
                })}
                {sources.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-stone-500">暂无订阅源</div>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onSaveSources}
              disabled={!connectedUserId || pending}
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> 保存订阅与分组
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
