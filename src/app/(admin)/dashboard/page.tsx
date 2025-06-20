
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { UserTable } from './components/UserTable';
import { AdminCampaignList } from './components/AdminCampaignList';
import { BarChart, LineChart, Users, FileText, Activity, Zap } from 'lucide-react';
import { ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart as RechartsBarChart, Line, LineChart as RechartsLineChart } from 'recharts';
import { useToast } from '@/hooks/use-toast';


interface PlatformStats {
  totalUsers: number;
  totalCampaigns: number;
  activeUsersToday: number; // Mocked
  campaignsCreatedToday: number; // Mocked
  // Could add more, e.g., top content formats, XP leaderboard data
}

const mockActivityData = [
  { date: 'Mon', users: Math.floor(Math.random() * 20) + 5, campaigns: Math.floor(Math.random() * 10) + 2 },
  { date: 'Tue', users: Math.floor(Math.random() * 20) + 7, campaigns: Math.floor(Math.random() * 10) + 3 },
  { date: 'Wed', users: Math.floor(Math.random() * 20) + 10, campaigns: Math.floor(Math.random() * 10) + 5 },
  { date: 'Thu', users: Math.floor(Math.random() * 20) + 12, campaigns: Math.floor(Math.random() * 10) + 4 },
  { date: 'Fri', users: Math.floor(Math.random() * 20) + 15, campaigns: Math.floor(Math.random() * 10) + 6 },
  { date: 'Sat', users: Math.floor(Math.random() * 20) + 8, campaigns: Math.floor(Math.random() * 10) + 3 },
  { date: 'Sun', users: Math.floor(Math.random() * 20) + 6, campaigns: Math.floor(Math.random() * 10) + 2 },
];


export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      // In a real app, these would be separate API calls or a combined stats endpoint
      const usersResponse = await fetch('/api/admin/users');
      const campaignsResponse = await fetch('/api/admin/campaigns');

      if (!usersResponse.ok || !campaignsResponse.ok) {
        throw new Error("Failed to fetch platform statistics");
      }

      const usersData = await usersResponse.json();
      const campaignsData = await campaignsResponse.json();

      setStats({
        totalUsers: usersData.length,
        totalCampaigns: campaignsData.length,
        activeUsersToday: Math.floor(Math.random() * usersData.length / 2) + 1, // Mock
        campaignsCreatedToday: Math.floor(Math.random() * 5) + 1, // Mock
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error fetching stats";
      toast({ title: "Error loading stats", description: errorMessage, variant: "destructive" });
      setStats({ totalUsers: 0, totalCampaigns: 0, activeUsersToday: 0, campaignsCreatedToday: 0 }); // Default on error
    } finally {
      setIsLoadingStats(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Oversee platform activity, manage users, and review campaigns.
        </p>
      </div>
      <Separator />

      {isLoadingStats || !stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader><CardTitle className="text-sm font-medium">Loading Stats...</CardTitle></CardHeader><CardContent><Loader2 className="h-6 w-6 animate-spin"/></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm font-medium">Loading Stats...</CardTitle></CardHeader><CardContent><Loader2 className="h-6 w-6 animate-spin"/></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm font-medium">Loading Stats...</CardTitle></CardHeader><CardContent><Loader2 className="h-6 w-6 animate-spin"/></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm font-medium">Loading Stats...</CardTitle></CardHeader><CardContent><Loader2 className="h-6 w-6 animate-spin"/></CardContent></Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered on the platform</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
              <p className="text-xs text-muted-foreground">Created across all users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users (Today)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsersToday}</div>
              <p className="text-xs text-muted-foreground">Mocked data for demonstration</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Campaigns (Today)</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.campaignsCreatedToday}</div>
              <p className="text-xs text-muted-foreground">Mocked data for demonstration</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Card>
        <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2 text-xl"><BarChart className="h-5 w-5 text-primary"/>Platform Activity (Mock Data)</CardTitle>
            <CardDescription>Overview of user and campaign creation trends this week.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={mockActivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        cursor={{fill: 'hsl(var(--muted))', fillOpacity: 0.3}}
                    />
                    <Legend wrapperStyle={{paddingTop: '20px'}} />
                    <Line type="monotone" dataKey="users" name="Active Users" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="campaigns" name="Campaigns Created" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--accent))" }} activeDot={{ r: 6 }} />
                </RechartsLineChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>


      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-2">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Oversight</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">User Accounts</CardTitle>
              <CardDescription>View, manage roles, and ban/unban users.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserTable />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="campaigns" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">All Campaigns</CardTitle>
              <CardDescription>View and manage all campaigns on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminCampaignList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
