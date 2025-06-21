
"use client";

import type { User as NextAuthUser } from 'next-auth';
import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MoreHorizontal, UserX, UserCheck, ShieldAlert, Edit, Search as SearchIcon, ShieldQuestion } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface AdminUser extends NextAuthUser {
  id: string;
  role: 'viewer' | 'editor' | 'admin';
  totalXP?: number;
  level?: number;
  isBanned?: boolean;
  createdAt?: Date | string; 
  updatedAt?: Date | string; 
}

interface UserAuditResult {
  riskScore: number;
  justification: string;
  recommendation: 'No action needed' | 'Monitor user activity' | 'Recommend role review' | 'Flag for immediate review';
}

export function UserTable() {
  const { data: session } = useSession(); // Get current admin's session
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // State for Audit Dialog
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [selectedUserForAudit, setSelectedUserForAudit] = useState<AdminUser | null>(null);
  const [auditResult, setAuditResult] = useState<UserAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch users");
      }
      const data: AdminUser[] = await response.json();
      const usersWithDates = data.map(u => ({
          ...u, 
          createdAt: u.createdAt ? new Date(u.createdAt) : undefined, 
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : undefined 
      }));
      setAllUsers(usersWithDates);
      setFilteredUsers(usersWithDates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "Error fetching users", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const usersToDisplay = allUsers.filter(user =>
      (user.name?.toLowerCase() || '').includes(lowerSearchTerm) ||
      (user.email?.toLowerCase() || '').includes(lowerSearchTerm) ||
      user.id.toLowerCase().includes(lowerSearchTerm)
    );
    setFilteredUsers(usersToDisplay);
  }, [searchTerm, allUsers]);

  const handleUpdateUser = async (userId: string, updates: { role?: AdminUser['role'], isBanned?: boolean }) => {
    setUpdatingUserId(userId);

    if (session?.user?.id === userId && (updates.role && updates.role !== 'admin' || updates.isBanned === true)) {
        toast({ title: "Action Not Allowed", description: "You cannot change your own role to non-admin or ban yourself.", variant: "destructive" });
        setUpdatingUserId(null);
        return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update user");
      toast({ title: "User Updated", description: `User ${result.user?.name || userId} has been updated.` });
      fetchUsers(); 
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "Update Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleOpenAuditDialog = (user: AdminUser) => {
    setSelectedUserForAudit(user);
    setAuditResult(null); // Clear previous results
    setIsAuditOpen(true);
  };
  
  const runUserAudit = useCallback(async () => {
    if (!selectedUserForAudit) return;
    setIsAuditing(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUserForAudit.id}/audit`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to run user audit.");
      setAuditResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      toast({ title: "Audit Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsAuditing(false);
    }
  }, [selectedUserForAudit, toast]);

  useEffect(() => {
    if (isAuditOpen && selectedUserForAudit) {
      runUserAudit();
    }
  }, [isAuditOpen, selectedUserForAudit, runUserAudit]);


  if (isLoading && filteredUsers.length === 0) {
    return <div className="flex justify-center items-center min-h-[200px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading users...</span></div>;
  }

  const getRiskColor = (score: number) => {
    if (score > 70) return 'text-destructive';
    if (score > 30) return 'text-orange-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-4">
        <div className="relative max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                placeholder="Search users (name, email, ID)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
            />
        </div>

        {filteredUsers.length === 0 && !isLoading && (
             <p className="text-center text-muted-foreground py-4">No users match your search or no users found.</p>
        )}

      {filteredUsers.length > 0 && (
        <div className="rounded-md border">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>XP / Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                    <Select
                        value={user.role}
                        onValueChange={(newRole) => handleUpdateUser(user.id, { role: newRole as AdminUser['role'] })}
                        disabled={updatingUserId === user.id || user.id === session?.user?.id}
                        >
                        <SelectTrigger className="h-8 w-[100px] text-xs">
                        <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                    </TableCell>
                    <TableCell>{user.totalXP ?? 0} / Lvl {user.level ?? 1}</TableCell>
                    <TableCell>
                    <Badge variant={user.isBanned ? "destructive" : "secondary"}>
                        {user.isBanned ? "Banned" : "Active"}
                    </Badge>
                    </TableCell>
                    <TableCell>{user.createdAt ? formatDistanceToNowStrict(new Date(user.createdAt), {addSuffix: true}) : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                    {updatingUserId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={user.id === session?.user?.id && user.role === 'admin'}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => alert("View user profile/details - This is a conceptual action. User details are visible in the table.")}>
                              <Edit className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleOpenAuditDialog(user)}>
                              <ShieldQuestion className="mr-2 h-4 w-4 text-blue-500" /> AI Audit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.isBanned ? (
                            <DropdownMenuItem 
                                onSelect={() => handleUpdateUser(user.id, { isBanned: false })}
                                disabled={user.id === session?.user?.id}
                            >
                                <UserCheck className="mr-2 h-4 w-4 text-green-500" /> Unban User
                            </DropdownMenuItem>
                            ) : (
                            <DropdownMenuItem 
                                onSelect={() => handleUpdateUser(user.id, { isBanned: true })}
                                disabled={user.id === session?.user?.id}
                            >
                                <UserX className="mr-2 h-4 w-4 text-destructive" /> Ban User
                            </DropdownMenuItem>
                            )}
                            {user.role !== 'admin' && (
                            <DropdownMenuItem 
                                onSelect={() => handleUpdateUser(user.id, { role: 'admin' })}
                                disabled={user.id === session?.user?.id}
                            >
                                <ShieldAlert className="mr-2 h-4 w-4 text-orange-500" /> Promote to Admin
                            </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      )}

      <Dialog open={isAuditOpen} onOpenChange={setIsAuditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldQuestion/> AI User Audit: {selectedUserForAudit?.name}</DialogTitle>
            <DialogDescription>
              Analyzing user activity for suspicious patterns.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isAuditing ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p>Running audit...</p>
              </div>
            ) : auditResult ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="text-center">
                    <CardDescription>Overall Risk Score</CardDescription>
                    <CardTitle className={`text-5xl ${getRiskColor(auditResult.riskScore)}`}>
                      {auditResult.riskScore}
                      <span className="text-3xl text-muted-foreground">/100</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={auditResult.riskScore} className="h-2" />
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Justification</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{auditResult.justification}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">AI Recommendation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-semibold">{auditResult.recommendation}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <p>No audit results available.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAuditOpen(false)}>Close</Button>
            <Button onClick={runUserAudit} disabled={isAuditing}>
              {isAuditing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Re-run Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
