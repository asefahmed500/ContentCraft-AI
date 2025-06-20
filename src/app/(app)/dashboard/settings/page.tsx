
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSession, signOut } from 'next-auth/react';
import { UserCircle, Users, ShieldCheck, Save, LogOut, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { FormEvent} from 'react';
import { useState, useEffect } from "react";
import type { User as NextAuthUser } from 'next-auth';

interface SessionUser extends NextAuthUser {
  id?: string;
  role?: string;
  totalXP?: number;
  level?: number;
  badges?: string[];
}


export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const { toast } = useToast();
  
  const user = session?.user as SessionUser | undefined;
  const authIsLoading = status === 'loading';

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);


  useEffect(() => {
    if (user) {
      setUserName(user.name || "");
      setUserEmail(user.email || "");
    }
  }, [user]);

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // To reflect name change in UI immediately if successful, call update from useSession
    // await updateSession({ user: { name: userName }}); // This is how you might update session data

    toast({ 
      title: "Profile Update (Simulated)", 
      description: `Name update to "${userName}" is simulated. Password changes would require a secure backend process and are also simulated here. No actual data has been changed on the server.` 
    });
    setIsSavingProfile(false);
  };

  const handleInviteUser = async (e: FormEvent) => {
    e.preventDefault();
    setIsSendingInvite(true);
    const target = e.target as typeof e.target & { email: { value: string }; role: { value: string } };
    const invitedEmail = target.email.value;
    const invitedRole = target.role.value;

    await new Promise(resolve => setTimeout(resolve, 1000)); 
    
    toast({ 
        title: "Invitation Sent (Simulated)", 
        description: `User ${invitedEmail} invited as ${invitedRole}. In a real system, an email would be sent, and the user would be added to a 'teams' or 'invitations' collection. This is a UI simulation.`
    });
    if (user?.role === 'admin') {
        (e.target as HTMLFormElement).reset();
    }
    setIsSendingInvite(false);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (authIsLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <p>Please log in to view settings.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-lg text-muted-foreground">
          Manage your account, profile, and team settings. Your current role is: <span className="font-semibold capitalize">{user.role || 'Viewer'}</span>.
        </p>
      </div>
      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2">
              <UserCircle className="h-6 w-6 text-primary" />
              User Profile
            </CardTitle>
            <CardDescription>View and update your personal information.</CardDescription>
          </CardHeader>
          <form onSubmit={handleProfileSave}>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="userName">Name</Label>
                <Input id="userName" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Your Name" disabled={isSavingProfile} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="userEmail">Email</Label>
                <Input id="userEmail" type="email" value={userEmail} disabled placeholder="your@email.com" />
                 <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
              </div>
               <div className="space-y-1">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" name="currentPassword" type="password" placeholder="Enter current password to change" disabled={isSavingProfile} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" name="newPassword" type="password" placeholder="Enter new password (min. 6 chars)" disabled={isSavingProfile} />
                 <p className="text-xs text-muted-foreground">Leave blank to keep current password.</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Team Management
            </CardTitle>
            <CardDescription>Invite and manage team members. (Admins only / Feature simulation)</CardDescription>
          </CardHeader>
           <form onSubmit={handleInviteUser}>
            <CardContent className="space-y-4">
                <div className="space-y-1">
                    <Label htmlFor="inviteEmail">Invite User by Email</Label>
                    <Input id="inviteEmail" name="email" type="email" placeholder="teammate@example.com" disabled={user.role !== 'admin' || isSendingInvite} required/>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="inviteRole">Assign Role</Label>
                    <select 
                        id="inviteRole" 
                        name="role" 
                        defaultValue="viewer"
                        className="w-full p-2 border rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-10 text-sm" 
                        disabled={user.role !== 'admin' || isSendingInvite}
                    >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                 <p className="text-xs text-muted-foreground">
                    Team management features are typically available for 'admin' roles. This is a simulation. A real system would involve email invitations and a 'teams' database collection.
                </p>
            </CardContent>
            <CardFooter>
                 <Button type="submit" variant="outline" disabled={user.role !== 'admin' || isSendingInvite}>
                    {isSendingInvite ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" /> }
                    Invite User
                </Button>
            </CardFooter>
           </form>
        </Card>
      </div>
      
      <Separator />
      <div className="flex justify-start">
          <Button variant="destructive" onClick={handleLogout} disabled={isSavingProfile || isSendingInvite}>
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
      </div>
    </div>
  );
}
