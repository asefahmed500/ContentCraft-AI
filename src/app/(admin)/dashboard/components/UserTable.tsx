
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
import { Loader2, MoreHorizontal, UserX, UserCheck, ShieldAlert, Edit, Search as SearchIcon } from 'lucide-react';
import { format } from 'date-fns';

interface AdminUser extends NextAuthUser {
  id: string;
  role: 'viewer' | 'editor' | 'admin';
  totalXP?: number;
  level?: number;
  isBanned?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export function UserTable() {
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

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
      setFilteredUsers(usersWithDates); // Initialize filteredUsers
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
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update user");
      }
      toast({ title: "User Updated", description: `User ${result.user?.name || userId} has been updated.` });
      fetchUsers(); // Refresh user list
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "Update Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (isLoading && filteredUsers.length === 0) {
    return <div className="flex justify-center items-center min-h-[200px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading users...</span></div>;
  }

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
                        disabled={updatingUserId === user.id || user.id === (allUsers.find(u => u.email === 'admin@example.com')?.id) /* Example: Lock admin role for a superadmin */}
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
                    <TableCell>{user.createdAt ? format(user.createdAt, 'MMM d, yyyy') : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                    {updatingUserId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => alert("View user profile/details - Not implemented yet")}>
                            <Edit className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.isBanned ? (
                            <DropdownMenuItem onSelect={() => handleUpdateUser(user.id, { isBanned: false })}>
                                <UserCheck className="mr-2 h-4 w-4 text-green-500" /> Unban User
                            </DropdownMenuItem>
                            ) : (
                            <DropdownMenuItem onSelect={() => handleUpdateUser(user.id, { isBanned: true })}>
                                <UserX className="mr-2 h-4 w-4 text-destructive" /> Ban User
                            </DropdownMenuItem>
                            )}
                            {user.role !== 'admin' && (
                            <DropdownMenuItem onSelect={() => handleUpdateUser(user.id, { role: 'admin' })}>
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
    </div>
  );
}

