
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { UserTable } from './components/UserTable';
import { AdminCampaignList } from './components/AdminCampaignList';
import { BarChart, LineChart as LucideLineChart, Users, FileText, Activity, Zap, Brain, Download, HelpCircle, PieChart, ListTree } from 'lucide-react'; // Renamed LineChart to LucideLineChart
import { ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart as RechartsBarChart, Line, LineChart as RechartsLineChart, Pie, Cell, PieChart as RechartsPieChart } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';


interface PlatformStats {
  totalUsers: number;
  totalCampaigns: number;
  activeUsersToday: number; 
  campaignsCreatedToday: number; 
  aiFlowsExecuted?: number; // Mocked
  feedbackItemsSubmitted?: number; // Mocked
}

const mockWeeklyActivityData = [
  { date: 'Mon', users: Math.floor(Math.random() * 20) + 5, campaigns: Math.floor(Math.random() * 10) + 2, flows: Math.floor(Math.random() * 50) + 20 },
  { date: 'Tue', users: Math.floor(Math.random() * 20) + 7, campaigns: Math.floor(Math.random() * 10) + 3, flows: Math.floor(Math.random() * 50) + 25 },
  { date: 'Wed', users: Math.floor(Math.random() * 20) + 10, campaigns: Math.floor(Math.random() * 10) + 5, flows: Math.floor(Math.random() * 50) + 30 },
  { date: 'Thu', users: Math.floor(Math.random() * 20) + 12, campaigns: Math.floor(Math.random() * 10) + 4, flows: Math.floor(Math.random() * 50) + 35 },
  { date: 'Fri', users: Math.floor(Math.random() * 20) + 15, campaigns: Math.floor(Math.random() * 10) + 6, flows: Math.floor(Math.random() * 50) + 40 },
  { date: 'Sat', users: Math.floor(Math.random() * 20) + 8, campaigns: Math.floor(Math.random() * 10) + 3, flows: Math.floor(Math.random() * 50) + 22 },
  { date: 'Sun', users: Math.floor(Math.random() * 20) + 6, campaigns: Math.floor(Math.random() * 10) + 2, flows: Math.floor(Math.random() * 50) + 18 },
];

const mockTopContentFormatsData = [
    { name: 'Blog Post', value: 400 + Math.floor(Math.random() * 100) },
    { name: 'Tweet', value: 300 + Math.floor(Math.random() * 80) },
    { name: 'LinkedIn Article', value: 200 + Math.floor(Math.random() * 60) },
    { name: 'Instagram Post', value: 250 + Math.floor(Math.random() * 70) },
    { name: 'TikTok Script', value: 150 + Math.floor(Math.random() * 50) },
];
const PIE_CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];


export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const usersResponse = await fetch('/api/admin/users');
      const campaignsResponse = await fetch('/api/admin/campaigns');
      // const feedbackResponse = await fetch('/api/admin/feedback'); // Assuming an admin feedback endpoint

      if (!usersResponse.ok || !campaignsResponse.ok) { // Add !feedbackResponse.ok if implementing
        throw new Error("Failed to fetch platform statistics");
      }

      const usersData = await usersResponse.json();
      const campaignsData = await campaignsResponse.json();
      // const feedbackData = await feedbackResponse.json(); // Assuming an admin feedback endpoint

      setStats({
        totalUsers: usersData.length,
        totalCampaigns: campaignsData.length,
        activeUsersToday: Math.floor(Math.random() * usersData.length / 2) + 1, 
        campaignsCreatedToday: Math.floor(Math.random() * 5) + 1, 
        aiFlowsExecuted: Math.floor(Math.random() * 500) + 200, // Mocked
        feedbackItemsSubmitted: Math.floor(Math.random() * 50) + 10, // Mocked, replace with feedbackData.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error fetching stats";
      toast({ title: "Error loading stats", description: errorMessage, variant: "destructive" });
      setStats({ totalUsers: 0, totalCampaigns: 0, activeUsersToday: 0, campaignsCreatedToday: 0, aiFlowsExecuted: 0, feedbackItemsSubmitted: 0 }); // Default on error
    } finally {
      setIsLoadingStats(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleDownloadPlaceholder = (dataType: string) => {
    toast({
        title: `Download ${dataType} (Placeholder)`,
        description: `This feature is conceptual. In a real application, this would trigger a CSV download of all ${dataType.toLowerCase()}.`,
        duration: 5000,
    });
  };


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
            {[...Array(6)].map((_, i) => ( // Increased skeleton cards
                 <Card key={i}><CardHeader><CardTitle className="text-sm font-medium">Loading Stats...</CardTitle></CardHeader><CardContent><Loader2 className="h-6 w-6 animate-spin"/></CardContent></Card>
            ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card className="xl:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered on platform</p>
            </CardContent>
          </Card>
          <Card className="xl:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
              <p className="text-xs text-muted-foreground">Created by all users</p>
            </CardContent>
          </Card>
          <Card className="xl:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users (Today)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsersToday}</div>
              <p className="text-xs text-muted-foreground">Mocked data</p>
            </CardContent>
          </Card>
          <Card className="xl:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Campaigns (Today)</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.campaignsCreatedToday}</div>
              <p className="text-xs text-muted-foreground">Mocked data</p>
            </CardContent>
          </Card>
           <Card className="xl:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Flows Executed</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.aiFlowsExecuted}</div>
              <p className="text-xs text-muted-foreground">Mocked total (e.g., Genkit)</p>
            </CardContent>
          </Card>
           <Card className="xl:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Feedback Items</CardTitle>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.feedbackItemsSubmitted}</div>
              <p className="text-xs text-muted-foreground">Total feedback submitted</p>
            </CardContent>
          </Card>
        </div>
      )}
      
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2 text-xl"><LucideLineChart className="h-5 w-5 text-primary"/>Weekly Platform Activity (Mock)</CardTitle>
                <CardDescription>Overview of user, campaign, and AI flow trends this week.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={mockWeeklyActivityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis yAxisId="left" stroke="hsl(var(--primary))" fontSize={12} />
                        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--accent))" fontSize={12} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                            cursor={{fill: 'hsl(var(--muted))', fillOpacity: 0.3}}
                        />
                        <Legend wrapperStyle={{paddingTop: '20px'}} />
                        <Line yAxisId="left" type="monotone" dataKey="users" name="Active Users" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
                        <Line yAxisId="left" type="monotone" dataKey="campaigns" name="Campaigns Created" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--chart-4))" }} activeDot={{ r: 6 }} />
                        <Line yAxisId="right" type="monotone" dataKey="flows" name="AI Flows" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--accent))" }} activeDot={{ r: 6 }} />
                    </RechartsLineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2 text-xl"><PieChart className="h-5 w-5 text-primary"/>Top Content Formats (Mock)</CardTitle>
                <CardDescription>Distribution of generated content formats.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                        <Pie data={mockTopContentFormatsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                            {mockTopContentFormatsData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}/>
                        <Legend wrapperStyle={{paddingTop: '20px'}}/>
                    </RechartsPieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    </div>


      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="users" className="whitespace-nowrap">User Management</TabsTrigger>
          <TabsTrigger value="campaigns" className="whitespace-nowrap">Campaign Oversight</TabsTrigger>
          <TabsTrigger value="data_export" className="whitespace-nowrap">Data Export</TabsTrigger>
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
              <CardDescription>View, manage, and moderate all campaigns on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminCampaignList />
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="data_export" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center gap-2"><Download className="h-5 w-5 text-primary"/>Data Export (Conceptual)</CardTitle>
              <CardDescription>Download platform data for backup or external analysis. These are placeholder buttons.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert>
                    <ListTree className="h-5 w-5" />
                    <AlertTitle>Conceptual Feature</AlertTitle>
                    <AlertDescription>
                        The following buttons simulate data export functionality. In a production environment, these would trigger server-side processes to generate and download CSV files.
                    </AlertDescription>
                </Alert>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button variant="outline" onClick={() => handleDownloadPlaceholder("All Campaigns")} className="w-full sm:w-auto">
                        <Download className="mr-2 h-4 w-4"/>Download All Campaigns as CSV
                    </Button>
                    <Button variant="outline" onClick={() => handleDownloadPlaceholder("Feedback Logs")} className="w-full sm:w-auto">
                        <Download className="mr-2 h-4 w-4"/>Download Feedback Logs as CSV
                    </Button>
                     <Button variant="outline" onClick={() => handleDownloadPlaceholder("User Data")} className="w-full sm:w-auto">
                        <Download className="mr-2 h-4 w-4"/>Download User Data as CSV
                    </Button>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

