"use client";
import { SiteHeader } from '@/components/SiteHeader';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

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


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // AuthProvider is now wrapped around the entire app in RootLayout via SessionProviderWrapper
  // but individual pages/layouts can still use it to consume context if structured this way.
  // For this specific layout, AuthProvider here ensures useAuth() works within DashboardLayoutContent.
  return (
    <AuthProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AuthProvider>
  );
}
