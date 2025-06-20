
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation'; 

interface AuthContextType {
  isAuthenticated: boolean;
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    totalXP?: number;
    level?: number;
    badges?: string[];
  } | null;
  login: (provider?: string, options?: Record<string, any>) => Promise<void>; 
  logout: () => Promise<void>; 
  isLoading: boolean;
  updateSessionUser: (data: Partial<AuthContextType['user']>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update: updateNextAuthSession } = useSession();
  const router = useRouter();

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  const login = async (provider?: string, options?: Record<string, any>) => {
    const result = await signIn(provider, options);
    if (result?.ok && !result.error) {
      // router.push('/dashboard'); // NextAuth typically handles redirect based on callbackUrl
    } else if (result?.error) {
      console.error("NextAuth SignIn Error:", result.error);
      throw new Error(result.error);
    }
  };

  const logout = async () => {
    await signOut({ redirect: false }); 
    router.push('/login'); 
  };

  const updateSessionUser = async (dataToUpdate: Partial<AuthContextType['user']>) => {
    await updateNextAuthSession({ user: dataToUpdate });
  };
  
  const user = session?.user ? {
    id: (session.user as any).id, 
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role: (session.user as any).role || 'viewer',
    totalXP: (session.user as any).totalXP ?? 0,
    level: (session.user as any).level ?? 1,
    badges: (session.user as any).badges ?? [],
  } : null;


  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading, updateSessionUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
