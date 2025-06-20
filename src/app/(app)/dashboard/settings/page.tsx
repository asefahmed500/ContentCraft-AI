
"use client";

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, KeyRound, Building, LogOut, Save, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { User as NextAuthUser } from 'next-auth';

interface SessionUser extends NextAuthUser {
  id?: string;
  role?: string;
}


export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session]);

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    if (!name.trim()) {
      toast({ title: "Validation Error", description: "Name cannot be empty.", variant: "destructive" });
      setIsUpdatingProfile(false);
      return;
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update profile.");
      }
      toast({ title: "Profile Updated", description: "Your name has been successfully updated." });
      // Update the session to reflect the new name immediately
      await updateSession({ user: { ...session?.user, name } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Profile Update Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsChangingPassword(true);
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({ title: "Validation Error", description: "All password fields are required.", variant: "destructive" });
      setIsChangingPassword(false);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Validation Error", description: "New passwords do not match.", variant: "destructive" });
      setIsChangingPassword(false);
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Validation Error", description: "New password must be at least 6 characters long.", variant: "destructive" });
      setIsChangingPassword(false);
      return;
    }

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to change password.");
      }
      toast({ title: "Password Changed", description: "Your password has been successfully updated. You may need to log in again." });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      // Optionally sign out the user for security
      // await signOut({ callbackUrl: '/login' }); 
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Password Change Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };


  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    // This is a placeholder. Actual account deletion is a destructive operation
    // and requires careful implementation (e.g., /api/user/delete-account).
    toast({
      title: "Account Deletion (Conceptual)",
      description: "This feature is conceptual. In a real app, this would permanently delete your account and data.",
      variant: "default",
      duration: 5000,
    });
    // Simulating sign out after conceptual deletion
    // await signOut({ callbackUrl: '/' }); 
    setIsDeletingAccount(false);
  };

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (status === 'unauthenticated' || !session) {
    // Should be handled by middleware, but as a fallback
    return <div className="text-center py-10">Please log in to view settings.</div>;
  }

  const isOAuthAccount = session.user?.email && !session.user?.image?.includes('placehold.co'); // Simple check; more robust might be needed (e.g. check account provider)

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-lg text-muted-foreground">
          Manage your profile, password, and other account settings.
        </p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><User className="h-5 w-5 text-primary"/> Profile Information</CardTitle>
          <CardDescription>Update your display name.</CardDescription>
        </CardHeader>
        <form onSubmit={handleProfileUpdate}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={session.user?.email || ''} disabled className="bg-muted/50" />
              <p className="text-xs text-muted-foreground">Your email address cannot be changed.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                disabled={isUpdatingProfile}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isUpdatingProfile || name === session.user?.name}>
              {isUpdatingProfile ? <Loader2 className="animate-spin" /> : <Save />} Update Profile
            </Button>
          </CardFooter>
        </form>
      </Card>

      {!isOAuthAccount && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary"/>Change Password</CardTitle>
            <CardDescription>Update your account password. Ensure it&apos;s strong and unique.</CardDescription>
          </CardHeader>
          <form onSubmit={handleChangePassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  disabled={isChangingPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  required
                  disabled={isChangingPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={isChangingPassword}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Change Password
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
      {isOAuthAccount && (
          <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary"/>Password Management</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    You signed in using a social provider (e.g., Google). Password management is handled by your social provider.
                </p>
            </CardContent>
          </Card>
      )}


      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><Building className="h-5 w-5 text-primary"/> Team Management (Placeholder)</CardTitle>
          <CardDescription>Manage your team members, roles, and permissions. (This feature is conceptual)</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Create and manage teams to collaborate on content campaigns. Invite members, assign roles (e.g., editor, viewer within a team context), and control access to specific projects.
          </p>
          <Button variant="outline" className="mt-4" disabled>
            Manage Teams (Coming Soon)
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="font-headline text-destructive flex items-center gap-2"><ShieldAlert className="h-5 w-5"/> Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-medium">Delete Account</h3>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This action is irreversible.
            </p>
          </div>
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeletingAccount}>
                {isDeletingAccount ? <Loader2 className="animate-spin" /> : null} Delete My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  account and remove all your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  Yes, Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
        <CardFooter>
             <Button variant="outline" onClick={() => signOut({ callbackUrl: '/login' })}>
                <LogOut className="mr-2 h-4 w-4" /> Log Out
             </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
