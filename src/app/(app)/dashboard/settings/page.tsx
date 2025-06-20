"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/AuthContext"; // Assuming user info might come from here
import { UserCircle, Users, ShieldCheck, Save, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function SettingsPage() {
  const { logout } = useAuth(); // Assuming useAuth provides user info and logout
  const { toast } = useToast();
  
  // Mock user data - in a real app, this would come from useAuth() or a similar context/store
  const [userName, setUserName] = useState("Demo User");
  const [userEmail, setUserEmail] = useState("user@example.com"); // This is also in SiteHeader, keep consistent or fetch

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate saving profile data
    toast({ title: "Profile Updated", description: "Your profile information has been saved." });
  };

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as typeof e.target & { email: { value: string }; role: { value: string } };
    toast({ title: "Invitation Sent (Simulated)", description: `User ${target.email.value} invited as ${target.role.value}.`});
    // Reset form or clear inputs here if needed
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-lg text-muted-foreground">
          Manage your account, profile, and team settings.
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
                <Label htmlFor="currentPassword">Current Password (Optional)</Label>
                <Input id="currentPassword" type="password" placeholder="Enter current password to change" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newPassword">New Password (Optional)</Label>
                <Input id="newPassword" type="password" placeholder="Enter new password" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Team Management Section (Placeholder) */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Team Management
            </CardTitle>
            <CardDescription>Invite and manage team members. (Feature coming soon / requires higher tier plan)</CardDescription>
          </CardHeader>
           <form onSubmit={handleInviteUser}>
            <CardContent className="space-y-4">
                <div className="space-y-1">
                    <Label htmlFor="inviteEmail">Invite User by Email</Label>
                    <Input id="inviteEmail" name="email" type="email" placeholder="teammate@example.com" />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="inviteRole">Assign Role</Label>
                    <select id="inviteRole" name="role" className="w-full p-2 border rounded-md bg-background text-foreground">
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin (Use with caution)</option>
                    </select>
                </div>
                 <p className="text-xs text-muted-foreground">
                    Full team and role management features depend on your subscription plan.
                    Currently, this is a simulation.
                </p>
            </CardContent>
            <CardFooter>
                 <Button type="submit" variant="outline">Invite User</Button>
            </CardFooter>
           </form>
        </Card>
      </div>
      
      <Separator />
      <div className="flex justify-start">
          <Button variant="destructive" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
      </div>
    </div>
  );
}
