
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  const isAuthenticated = !!token;

  // Handle authenticated but banned users first
  if (isAuthenticated && token.isBanned) {
    // If a banned user tries to access any route or login/signup again
    if (pathname.startsWith('/admin') || pathname.startsWith('/api') || pathname === '/login' || pathname === '/signup' || pathname === '/') {
      // Allow access to /api/auth/signout for banned users
      if (pathname.startsWith('/api/auth/signout')) {
        return NextResponse.next();
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'AccountSuspended'); 
      if (pathname !== '/login') { // Avoid redirect loop if already on login
          return NextResponse.redirect(loginUrl);
      }
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

  // If trying to access login/signup and already authenticated (and not banned)
  if ((pathname === '/login' || pathname === '/signup') && isAuthenticated && !token.isBanned) {
    const destinationUrl = token.role === 'admin' 
      ? new URL('/admin/dashboard', request.url) 
      : new URL('/', request.url); // Non-admins to home page
    return NextResponse.redirect(destinationUrl);
  }
  
  // If an authenticated non-admin user tries to access the root path, let them.
  // If they try to access specific paths that were part of (app) and are now removed, they'll get 404.

  return NextResponse.next();
}

export const config = {
  // Apply middleware to admin routes, login, signup, and potentially API routes if needed for broader auth checks.
  // Root path '/' is also included to handle redirects for authenticated users.
  matcher: ['/admin/:path*', '/login', '/signup', '/api/((?!auth|public).*)', '/'],
};
