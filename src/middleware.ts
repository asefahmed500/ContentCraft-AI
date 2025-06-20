
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  const isAuthenticated = !!token;

  // Handle authenticated but banned users first
  if (isAuthenticated && token.isBanned) {
    // If a banned user tries to access any protected route, redirect them to login.
    // The signIn callback in NextAuth should then prevent actual login and show an error.
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
      const loginUrl = new URL('/login', request.url);
      // Optional: you could add a query param to show a specific "account suspended" message on the login page
      // loginUrl.searchParams.set('error', 'AccountSuspended');
      return NextResponse.redirect(loginUrl);
    }
    // If a banned user is somehow trying to access login/signup again with a valid (but banned) token,
    // let them proceed to login, where the ban will be enforced by the signIn callback.
    // This scenario is less likely if they are already "authenticated" per the token.
  }

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // If user is authenticated but not admin (and not banned, as handled above)
    if (token.role !== 'admin') {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // If trying to access general dashboard and not authenticated, redirect to login
  // (Banned users are handled above, so this is for genuinely unauthenticated users)
  if (pathname.startsWith('/dashboard') && !isAuthenticated && !pathname.startsWith('/admin')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If trying to access login/signup and already authenticated (and not banned), redirect to appropriate dashboard
  if ((pathname === '/login' || pathname === '/signup') && isAuthenticated && !token.isBanned) {
    const dashboardUrl = token.role === 'admin' ? new URL('/admin/dashboard', request.url) : new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login', '/signup'],
};
