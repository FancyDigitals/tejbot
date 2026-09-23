import { NextResponse } from 'next/server';
import {
  verifySessionToken,
  getSessionCookieName,
} from './lib/auth.js';

export function proxy(request) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(
    getSessionCookieName()
  )?.value;

  const authenticated = verifySessionToken(token);

  if (pathname === '/login') {
    if (authenticated) {
      return NextResponse.redirect(
        new URL('/dashboard', request.url)
      );
    }

    return NextResponse.next();
  }

  if (!authenticated) {
    const loginUrl = new URL('/login', request.url);

    loginUrl.searchParams.set('from', pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};