"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // Keep useRouter for navigation after sign out

interface AuthContextType {
  isAuthenticated: boolean;
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  } | null;
  login: (provider?: string, options?: Record<string, any>) => Promise<void>; // Modified to use NextAuth's signIn
  logout: () => Promise<void>; // Modified to use NextAuth's signOut
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  const login = async (provider?: string, options?: Record<string, any>) => {
    // For credentials, options would be { email, password, redirect: false }
    // For OAuth, provider would be 'google', options could be { callbackUrl: '/dashboard' }
    const result = await signIn(provider, options);
    if (result?.ok && !result.error) {
      // Successful sign-in, NextAuth handles redirection if not specified otherwise
      // Or you can handle it here if redirect: false was used
      // router.push('/dashboard'); // Example: Manually redirect if needed
    } else if (result?.error) {
      // Handle errors, e.g., display a toast or set an error state
      console.error("NextAuth SignIn Error:", result.error);
      // Propagate error to be handled by the calling component
      throw new Error(result.error);
    }
  };

  const logout = async () => {
    await signOut({ redirect: false }); // Prevent NextAuth default redirect
    router.push('/login'); // Manually redirect to login page
  };
  
  const user = session?.user ? {
    id: (session.user as any).id, // Assuming id is added in session callback
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role: (session.user as any).role || 'viewer' // Assuming role is added
  } : null;


  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
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
