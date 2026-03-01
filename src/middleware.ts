import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_COOKIE = 'nexus_admin';

function toHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

async function hashAdminToken(token: string) {
  const data = new TextEncoder().encode(`nexus_admin:${token}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/settings' || pathname.startsWith('/settings/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/settings';
    return NextResponse.redirect(url);
  }

  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (pathname === '/admin/login') return NextResponse.next();

  const token = (process.env.ADMIN_TOKEN || '').trim();
  if (!token) return NextResponse.redirect(new URL('/admin/login', request.url));

  const expected = await hashAdminToken(token);
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value || '';
  if (cookie !== expected) return NextResponse.redirect(new URL('/admin/login', request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/settings/:path*'],
};

