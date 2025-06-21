
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react"; 
import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { Logo } from "@/components/Logo";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
    <path fill="currentColor" d="M488 261.8C488 403.3 381.5 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
  </svg>
);

function SignUpPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthenticated = status === 'authenticated';
  const authLoading = status === 'loading';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const destination = session.user?.role === 'admin' ? '/admin/dashboard' : '/';
      router.replace(destination);
    }
  }, [authLoading, isAuthenticated, router, session]);

  const handleCredentialsSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required.');
      setIsSubmitting(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Registration failed. Please try again.');
      } else {
        setSuccessMessage('Registration successful! Redirecting to login...');
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          router.push('/login?signup=success'); 
        }, 2000);
      }
    } catch (err) {
      console.error("Signup API call error:", err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleSubmitting(true);
    setError('');
    try {
      await signIn('google', { callbackUrl: '/', redirect: false });
    } catch (e: any) {
      setError(e.message || 'Google Sign-Up failed. Please try again.');
    } finally {
       // Let session status changes handle UI
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
          <CardTitle className="font-headline text-2xl">Create Your Account</CardTitle>
          <CardDescription>Join ContentCraft AI and revolutionize your content.</CardDescription>
        </CardHeader>
        <form onSubmit={handleCredentialsSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="Your Name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
                disabled={isSubmitting || isGoogleSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                disabled={isSubmitting || isGoogleSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="•••••••• (min. 6 characters)" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                disabled={isSubmitting || isGoogleSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input 
                id="confirm-password" 
                type="password" 
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
                disabled={isSubmitting || isGoogleSubmitting}
              />
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            {successMessage && <p className="text-sm text-green-600 text-center">{successMessage}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting || isGoogleSubmitting || successMessage !== ''}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus />} Sign Up with Email
            </Button>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or sign up with
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignUp} disabled={isSubmitting || isGoogleSubmitting || successMessage !== ''}>
              {isGoogleSubmitting ? <Loader2 className="animate-spin" /> : <GoogleIcon />} Google
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function SignUpPage() {
  return (
      <SignUpPageContent />
  );
}
