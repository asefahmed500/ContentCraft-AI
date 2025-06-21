
"use client";
import { SiteHeader } from '@/components/SiteHeader';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { ReactNode} from 'react';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function CreatorDashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // User is not authenticated, send them to the login page.
      router.replace('/login');
    }
    if (!isLoading && isAuthenticated && session?.user?.role === 'admin') {
      // Admins should use their own dashboard.
      router.replace('/admin/dashboard');
    }
  }, [isAuthenticated, isLoading, router, session]);

  if (isLoading || !isAuthenticated || (isAuthenticated && session.user?.role === 'admin')) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        {isLoading && <p className="ml-4">Loading your session...</p>}
        {!isLoading && !isAuthenticated && <p className="ml-4">Redirecting to login...</p>}
        {isAuthenticated && session?.user?.role === 'admin' && <p className="ml-4">Redirecting to admin panel...</p>}
      </div>
    );
  }

  // User is authenticated and not an admin, show the dashboard.
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container py-8">{children}</main>
    </div>
  );
}
