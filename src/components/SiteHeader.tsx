
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, UserCircle, LayoutDashboard } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useSession, signOut } from 'next-auth/react'; 
import UserXPDisplay from '@/components/UserXPDisplay';
import type { User as NextAuthUser } from 'next-auth';

interface SessionUser extends NextAuthUser {
  id?: string;
  role?: string;
  totalXP?: number;
  level?: number;
  badges?: string[];
}


export function SiteHeader() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const user = session?.user as SessionUser | undefined;

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Logo />
        </Link>
        <nav className="flex flex-1 items-center space-x-4">
          {isAuthenticated && user?.role === 'admin' && (
            <Button variant="ghost" asChild className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
              <Link href="/admin/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4"/> Admin Dashboard
              </Link>
            </Button>
          )}
        </nav>
        <div className="flex items-center space-x-4">
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || `https://placehold.co/100x100.png?text=${user.name?.charAt(0).toUpperCase() || 'U'}`} alt={user.name || "User avatar"} data-ai-hint="user avatar" />
                    <AvatarFallback>
                      {user.name ? user.name.charAt(0).toUpperCase() : <UserCircle className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1 p-1">
                    <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email || "No email"}
                    </p>
                     {user.role && <p className="text-xs leading-none text-muted-foreground capitalize">Role: {user.role}</p>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <UserXPDisplay /> 
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

    