'use client';

import { useState } from 'react';
import { adminLogin } from '@/app/admin/actions/adminAuthActions';
import { useRouter } from 'next/navigation';
import { AlertCircle, LockKeyhole } from 'lucide-react';

export function AdminLoginForm() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    try {
      const res = await adminLogin(token);
      if (!res.success) {
        setError(res.error || '登录失败');
        return;
      }
      router.replace('/admin/settings');
      router.refresh();
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-stone-100 bg-stone-50/50">
        <h1 className="font-serif text-2xl font-black tracking-tight text-stone-900 flex items-center gap-2">
          <LockKeyhole className="w-5 h-5 text-stone-500" /> 管理员登录
        </h1>
        <p className="text-sm text-stone-500 mt-2">请输入 ADMIN_TOKEN 进入系统设置与 Readflow 管理。</p>
      </div>

      <div className="p-6 space-y-4">
        {error ? (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-xs font-bold tracking-widest uppercase text-stone-500">Admin Token</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-4 py-3 border border-stone-200 rounded-lg bg-white text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-stone-400"
            placeholder="请输入 ADMIN_TOKEN"
            autoComplete="off"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full px-6 py-3 bg-stone-900 text-white font-bold rounded-lg shadow hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          {pending ? '登录中...' : '登录'}
        </button>
      </div>
    </form>
  );
}
