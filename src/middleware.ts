
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  const isAuthenticated = !!token;

  // Handle authenticated but banned users first
  if (isAuthenticated && token.isBanned) {
    // Allow access to /api/auth/signout for banned users
    if (pathname.startsWith('/api/auth/signout')) {
      return NextResponse.next();
    }
    // For any other path, including login attempts, redirect to login with an error
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'This account has been suspended.'); 
    if (pathname !== '/login') { // Avoid redirect loop if already on login page
        return NextResponse.redirect(loginUrl);
    }
    return NextResponse.rewrite(loginUrl); // Show login page with error, but keep URL if user manually types it
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
      : new URL('/', request.url); // Non-admins to home page, since their dashboard is removed
    return NextResponse.redirect(destinationUrl);
  }
  
  // If an authenticated non-admin user tries to access the root path, let them.
  // This middleware is now simpler as there's no /dashboard for non-admins to protect.

  return NextResponse.next();
}

export const config = {
  // Apply middleware to admin routes, login, signup, and API routes (excluding auth and public).
  // The root path '/' is included to handle redirects for authenticated users away from the landing page.
  matcher: ['/admin/:path*', '/login', '/signup', '/api/((?!auth|public).*)', '/'],
};
