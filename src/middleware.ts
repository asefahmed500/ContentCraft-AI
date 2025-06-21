
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  const isAuthenticated = !!token;
  const isBanned = isAuthenticated && token.isBanned;

  // Handle banned users first. They should be logged out and sent to login with an error.
  if (isBanned) {
    if (pathname.startsWith('/api/auth/signout')) {
      return NextResponse.next();
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'This account has been suspended.');
    if (pathname !== '/login') {
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.rewrite(loginUrl);
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
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // If trying to access login/signup and already authenticated (and not banned)
  if ((pathname === '/login' || pathname === '/signup') && isAuthenticated) {
    const destinationUrl = token.role === 'admin'
      ? new URL('/admin/dashboard', request.url)
      : new URL('/', request.url); // Non-admins go to the home page now
    return NextResponse.redirect(destinationUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all relevant routes, removing /dashboard since it no longer exists.
  matcher: ['/admin/:path*', '/login', '/signup', '/api/((?!auth|public).*)'],
};
