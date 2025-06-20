import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('authToken'); // This is a placeholder for actual token validation
  const { pathname } = request.nextUrl;

  // If trying to access dashboard and not authenticated, redirect to login
  if (pathname.startsWith('/dashboard') && !authToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If trying to access login/signup and already authenticated, redirect to dashboard
  if ((pathname.startsWith('/login') || pathname.startsWith('/signup')) && authToken) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
