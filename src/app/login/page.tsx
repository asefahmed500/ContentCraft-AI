
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/components/AuthContext"; 
import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { Logo } from "@/components/Logo";
import { useRouter, useSearchParams } from "next/navigation"; 
import { Loader2, LogIn } from "lucide-react"; 

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
    <path fill="currentColor" d="M488 261.8C488 403.3 381.5 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
  </svg>
);


function LoginPageContent() {
  const { login, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(callbackUrl);
    }
  }, [authLoading, isAuthenticated, router, callbackUrl]);


  const handleCredentialsSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    if (!email || !password) {
      setError('Email and password are required.');
      setIsSubmitting(false);
      return;
    }
    try {
      // Use redirect: false to handle success/error manually or rely on useEffect for redirection
      const result = await login(undefined, { email, password, redirect: false, callbackUrl });
      if (result?.error) { // Note: login from AuthContext might not directly return NextAuth result like this
        setError(result.error); // Adjust based on how login in AuthContext handles errors
      } else if (!result?.ok) {
        // If login doesn't throw but isn't "ok", there might be a subtle issue.
        // This part depends on what your `login` function actually returns.
        // For now, we assume error is thrown or handled by useEffect for success.
      }
      // Successful login redirection is handled by the useEffect hook
    } catch (e: any) {
      setError(e.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await login('google', { redirect: false, callbackUrl });
      // Successful login redirection is handled by the useEffect hook
    } catch (e: any) {
      setError(e.message || 'Google Sign-In failed. Please try again.');
      setIsSubmitting(false); // Only set to false if error occurs, otherwise NextAuth handles redirect
    }
  };
  
  if (authLoading || (!authLoading && isAuthenticated)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-8 left-8">
        <Link href="/" aria-label="Back to home">
          <Logo />
        </Link>
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="font-headline text-2xl">Welcome Back!</CardTitle>
          <CardDescription>Enter your credentials to access ContentCraft AI</CardDescription>
        </CardHeader>
        <form onSubmit={handleCredentialsSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                disabled={isSubmitting}
              />
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && !error.includes("Google") ? <Loader2 className="animate-spin" /> : <LogIn />} Login
            </Button>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting}>
              {isSubmitting && error.includes("Google") ? <Loader2 className="animate-spin" /> : <GoogleIcon />} Google
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Sign Up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginPageContent />
    </AuthProvider>
  )
}
