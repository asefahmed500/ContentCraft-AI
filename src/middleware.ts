
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  const isAuthenticated = !!token;

  // Handle authenticated but banned users first
  if (isAuthenticated && token.isBanned) {
    // If a banned user tries to access any protected route or login/signup again
    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname === '/login' || pathname === '/signup') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'AccountSuspended'); // Provide a specific error for UI
      // Do not set callbackUrl for banned users trying to log in, send them to login with error
      return NextResponse.redirect(loginUrl);
    }
  }

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (token.role !== 'admin') {
      // Non-admin trying to access /admin, redirect to home page
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  // If trying to access /dashboard (which is now considered deleted for non-admins)
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname); 
      return NextResponse.redirect(loginUrl);
    }
    // If authenticated but not an admin, /dashboard is gone, so redirect to home
    if (token.role !== 'admin') {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
    // If an admin somehow tries to access /dashboard/* (e.g. old bookmark),
    // and if /dashboard/* routes don't exist, they'll get a 404.
    // If they were trying to get to /admin/dashboard, they should use that path.
  }

  // If trying to access login/signup and already authenticated (and not banned)
  if ((pathname === '/login' || pathname === '/signup') && isAuthenticated && !token.isBanned) {
    const destinationUrl = token.role === 'admin' 
      ? new URL('/admin/dashboard', request.url) 
      : new URL('/', request.url); // Non-admins to home page
    return NextResponse.redirect(destinationUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login', '/signup'],
};

    