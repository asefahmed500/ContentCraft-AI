
"use client";
import { SiteHeader } from '@/components/SiteHeader';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { ReactNode} from 'react';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?callbackUrl=/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container py-8">{children}</main>
    </div>
  );
}


export default function DashboardLayout({ children }: { children: ReactNode }) {
  // SessionProvider is now at the root in RootLayout (via SessionProviderWrapper)
  // This component directly uses useSession for its logic.
  return (
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
  );
}
