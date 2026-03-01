'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';

const ADMIN_COOKIE = 'nexus_admin';

function hashAdminToken(token: string) {
  return crypto.createHash('sha256').update(`nexus_admin:${token}`).digest('hex');
}

export async function adminLogin(inputToken: string) {
  const expectedRaw = (process.env.ADMIN_TOKEN || '').trim();
  if (!expectedRaw) return { success: false, error: '未配置 ADMIN_TOKEN' };

  const provided = String(inputToken || '').trim();
  if (!provided) return { success: false, error: '请输入 Token' };
  if (provided !== expectedRaw) return { success: false, error: 'Token 不正确' };

  const value = hashAdminToken(expectedRaw);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return { success: true };
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
