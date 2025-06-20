"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/AuthContext";
import { UserCircle, Users, ShieldCheck, Save, LogOut, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { user, logout, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState(""); // Email might not be editable

  useEffect(() => {
    if (user) {
      setUserName(user.name || "");
      setUserEmail(user.email || "");
    }
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd call an API to update the user's profile
    // For example: /api/user/profile
    toast({ title: "Profile Update (Simulated)", description: `Name would be updated to: ${userName}.` });
    // This might involve re-fetching session or updating NextAuth session if name changes
  };

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as typeof e.target & { email: { value: string }; role: { value: string } };
    toast({ title: "Invitation Sent (Simulated)", description: `User ${target.email.value} invited as ${target.role.value}.`});
    // Reset form or clear inputs here if needed
  };

  if (authIsLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by the dashboard layout redirecting to login
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
        {/* User Profile Section */}
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
                <Input id="userName" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Your Name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="userEmail">Email</Label>
                <Input id="userEmail" type="email" value={userEmail} disabled placeholder="your@email.com" />
                 <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
              </div>
               <div className="space-y-1">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" placeholder="Enter current password to change" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" placeholder="Enter new password (min. 6 chars)" />
                 <p className="text-xs text-muted-foreground">Leave blank to keep current password.</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Team Management Section (Simulated/Placeholder) */}
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
                    <Input id="inviteEmail" name="email" type="email" placeholder="teammate@example.com" disabled={user.role !== 'admin'} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="inviteRole">Assign Role</Label>
                    <select id="inviteRole" name="role" className="w-full p-2 border rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed" disabled={user.role !== 'admin'}>
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                 <p className="text-xs text-muted-foreground">
                    Team management features are typically available for 'admin' roles. This is a simulation.
                </p>
            </CardContent>
            <CardFooter>
                 <Button type="submit" variant="outline" disabled={user.role !== 'admin'}>Invite User</Button>
            </CardFooter>
           </form>
        </Card>
      </div>
      
      <Separator />
      <div className="flex justify-start">
          <Button variant="destructive" onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
      </div>
    </div>
  );
}
