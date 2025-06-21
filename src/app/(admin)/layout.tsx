
"use client";
import { SiteHeader } from '@/components/SiteHeader';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { ReactNode} from 'react';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAdmin = status === 'authenticated' && session?.user?.role === 'admin';
  const isLoading = status === 'loading';

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      // This should ideally be caught by middleware first,
      // but this is a client-side fallback.
      router.replace('/creator-dashboard'); 
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading || !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        {isLoading && <p className="ml-4">Verifying admin permissions...</p>}
        {!isLoading && !isAdmin && <p className="ml-4">Access Denied. Redirecting...</p>}
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

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
