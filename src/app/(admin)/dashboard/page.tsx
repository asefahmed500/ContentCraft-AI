
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { UserTable } from './components/UserTable';
import { AdminCampaignList } from './components/AdminCampaignList';
import { FlaggedContentTable } from './components/FlaggedContentTable'; 
import { AgentDebateDisplay } from './components/AgentDebateDisplay';
import type { Campaign, ContentVersion, AgentInteraction, MultiFormatContent } from '@/types/content';
import type { User as NextAuthUser } from 'next-auth';
import { BarChart, BrainCircuit, LineChart as LucideLineChart, Users, FileText, Activity, Zap, Brain, Download, Info, PieChart, ListTree, XCircle, MessageSquare, Trophy, ShieldAlert as ShieldAlertIcon, BotMessageSquare, Edit } from 'lucide-react';
import { ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart as RechartsBarChart, Line, LineChart as RechartsLineChart, Pie, Cell, PieChart as RechartsPieChart } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format, formatDistanceToNow } from 'date-fns';

interface PlatformStats {
  totalUsers: number;
  totalCampaigns: number;
  activeUsersToday: number; 
  campaignsCreatedToday: number; 
  aiFlowsExecuted?: number; 
  feedbackItemsSubmitted?: number;
}

interface AdminUser extends NextAuthUser {
  id: string;
  role: 'viewer' | 'editor' | 'admin';
  totalXP?: number;
  level?: number;
  isBanned?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
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

  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [campaignFetchError, setCampaignFetchError] = useState<string | null>(null);
  
  const [selectedCampaignForAdminView, setSelectedCampaignForAdminView] = useState<Campaign | null>(null);
  const [isFetchingCampaignDetail, setIsFetchingCampaignDetail] = useState(false);
  
  const [activeMainTab, setActiveMainTab] = useState("overview");
  const [leaderboardUsers, setLeaderboardUsers] = useState<AdminUser[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);

  const [flaggedContentRefreshTrigger, setFlaggedContentRefreshTrigger] = useState(0);

  const [isDebating, setIsDebating] = useState(false);

  // State for Revise Content Dialog
  const [isReviseDialogOpen, setIsReviseDialogOpen] = useState(false);
  const [contentToRevise, setContentToRevise] = useState<{originalContent: string; versionInfo: string} | null>(null);
  const [revisionInstructions, setRevisionInstructions] = useState('');
  const [revisionAudience, setRevisionAudience] = useState('');
  const [revisionTone, setRevisionTone] = useState('');
  const [revisionResult, setRevisionResult] = useState<string | null>(null);
  const [isRevising, setIsRevising] = useState(false);


  const fetchAllCampaigns = useCallback(async (showToast = false) => {
    setIsLoadingCampaigns(true);
    setCampaignFetchError(null);
    try {
      const response = await fetch('/api/admin/campaigns'); 
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch campaigns: ${response.statusText}`);
      }
      const data: Campaign[] = await response.json(); 
      setAllCampaigns(data); 
      if (showToast) toast({title: "Campaigns Refreshed", description: "Admin campaign list has been updated."});
    } catch (err) {
      console.error("AdminCampaignList fetch error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setCampaignFetchError(errorMessage);
      toast({ title: "Error fetching campaigns", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingCampaigns(false);
    }
  }, [toast]);


  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const usersResponse = await fetch('/api/admin/users');
      if (!usersResponse.ok) throw new Error("Failed to fetch users for stats");
      const usersData = await usersResponse.json();
      
      setStats({
        totalUsers: usersData.length,
        totalCampaigns: allCampaigns.length, 
        activeUsersToday: Math.floor(Math.random() * usersData.length / 2) + 1, 
        campaignsCreatedToday: Math.floor(Math.random() * Math.min(5, allCampaigns.length)) + 1, 
        aiFlowsExecuted: Math.floor(Math.random() * 500) + 200,
        feedbackItemsSubmitted: Math.floor(Math.random() * 50) + 10,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error fetching stats";
      toast({ title: "Error loading stats", description: errorMessage, variant: "destructive" });
      setStats({ totalUsers: 0, totalCampaigns: 0, activeUsersToday: 0, campaignsCreatedToday: 0, aiFlowsExecuted: 0, feedbackItemsSubmitted: 0 });
    } finally {
      setIsLoadingStats(false);
    }
  }, [toast, allCampaigns]); 

  const fetchLeaderboardData = useCallback(async () => {
    setIsLoadingLeaderboard(true);
    try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to fetch users for leaderboard");
        }
        const users: AdminUser[] = await response.json();
        const sortedUsers = users
            .map(u => ({...u, totalXP: u.totalXP || 0, level: u.level || 1})) 
            .sort((a, b) => (b.totalXP!) - (a.totalXP!))
            .slice(0, 10); 
        setLeaderboardUsers(sortedUsers);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast({ title: "Error fetching leaderboard", description: errorMessage, variant: "destructive" });
        setLeaderboardUsers([]);
    } finally {
        setIsLoadingLeaderboard(false);
    }
  }, [toast]);


  useEffect(() => {
    fetchAllCampaigns();
    fetchLeaderboardData();
  }, [fetchAllCampaigns, fetchLeaderboardData]);

  useEffect(() => {
    if (!isLoadingCampaigns) { 
        fetchStats();
    }
  }, [allCampaigns, isLoadingCampaigns, fetchStats]);

  const fetchSingleCampaign = useCallback(async (campaignId: string): Promise<Campaign | null> => {
    setIsFetchingCampaignDetail(true);
    try {
        const response = await fetch(`/api/admin/campaigns?id=${campaignId}&single=true`); 
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to fetch updated campaign details");
        }
        const campaignData: Campaign = await response.json(); 
        return campaignData;
    } catch (err) {
        toast({title: "Error fetching campaign", description: (err as Error).message, variant: "destructive"});
        return null;
    } finally {
        setIsFetchingCampaignDetail(false);
    }
  }, [toast]);

  const handleRefreshFlaggedContent = useCallback(async () => {
    setFlaggedContentRefreshTrigger(prev => prev + 1);
    await fetchAllCampaigns(false);
    if (selectedCampaignForAdminView) {
      const updatedCampaign = await fetchSingleCampaign(selectedCampaignForAdminView.id);
      if (updatedCampaign) setSelectedCampaignForAdminView(updatedCampaign);
    }
  }, [fetchAllCampaigns, selectedCampaignForAdminView, fetchSingleCampaign]);

  const handleRunDebate = async (campaign: Campaign) => {
    setIsDebating(true);
    toast({ title: "Creative War Room Initialized", description: "AI agents are collaborating. This may take a moment."});
    try {
      const debateResponse = await fetch('/api/agents/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: campaign.brief, title: campaign.title })
      });

      if (!debateResponse.ok) {
        const errorData = await debateResponse.json();
        throw new Error(errorData.error || 'Failed to get debate from AI agents.');
      }

      const debateResult = await debateResponse.json();

      const agentDebatesForDb: AgentInteraction[] = debateResult.debateLog.map((log: any) => ({
          agent: log.agentRole,
          agentName: log.agentName,
          message: log.message,
          timestamp: new Date()
      }));

      const updateResponse = await fetch(`/api/campaigns?id=${campaign.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentDebates: agentDebatesForDb, status: 'review' })
      });
      
      if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.error || "Failed to save debate results to campaign.");
      }

      toast({ title: "Strategy Session Complete!", description: "Debate log has been saved to the campaign." });
      const updatedCampaign = await fetchSingleCampaign(campaign.id);
      if (updatedCampaign) {
          setSelectedCampaignForAdminView(updatedCampaign);
          setAllCampaigns(prev => prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c));
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "War Room Error", description: errorMessage, variant: 'destructive' });
    } finally {
      setIsDebating(false);
    }
  };

  const handleOpenReviseDialog = (version: ContentVersion) => {
    const originalContent = version.multiFormatContentSnapshot.blogPost || 
                            Object.values(version.multiFormatContentSnapshot).find(c => !!c) || 
                            '';
    setContentToRevise({
      originalContent,
      versionInfo: `Version ${version.versionNumber} by ${version.actorName}`
    });
    setRevisionInstructions('');
    setRevisionAudience('');
    setRevisionTone('');
    setRevisionResult(null);
    setIsReviseDialogOpen(true);
  };

  const handleReviseContent = async () => {
    if (!contentToRevise) return;
    setIsRevising(true);
    setRevisionResult(null);
    try {
      const response = await fetch('/api/content/revise', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          originalContent: contentToRevise.originalContent,
          revisionInstructions,
          targetAudience: revisionAudience,
          desiredTone: revisionTone,
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to revise content.');
      }
      setRevisionResult(result.revisedContent);
      toast({title: "Content Revised", description: "The AI has generated a revised version of your content."});
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      toast({title: "Revision Error", description: errorMessage, variant: "destructive"});
    } finally {
      setIsRevising(false);
    }
  };

  const handleAdminCampaignAction = useCallback(async (campaignId: string, action: 'view' | 'edit' | 'delete' | 'flag') => {
    if (action === 'view') {
        const campaignDetail = await fetchSingleCampaign(campaignId);
        if (campaignDetail) {
            setSelectedCampaignForAdminView(campaignDetail);
            setActiveMainTab("campaign_detail_view"); 
            toast({title: "Campaign Loaded", description: `Viewing details for "${campaignDetail.title}"`});
        } else {
            toast({title: "Error", description: "Could not find campaign details.", variant: "destructive"});
        }
    } else if (action === 'edit') {
        toast({title: "Edit Action (Admin)", description: `Admin edit for campaign ${campaignId} is conceptual. Campaign details can be viewed.`, variant: "default"});
    } else if (action === 'flag') { 
        await fetchAllCampaigns(true); 
        if (selectedCampaignForAdminView && selectedCampaignForAdminView.id === campaignId) {
            const updatedCampaign = await fetchSingleCampaign(campaignId); 
            if (updatedCampaign) setSelectedCampaignForAdminView(updatedCampaign);
        }
    }
  }, [toast, fetchAllCampaigns, selectedCampaignForAdminView, fetchSingleCampaign]); 
  
  const handleAdminCampaignDeleted = (deletedCampaignId: string) => {
    setAllCampaigns(prev => prev.filter(c => c.id !== deletedCampaignId));
    if (selectedCampaignForAdminView && selectedCampaignForAdminView.id === deletedCampaignId) {
        setSelectedCampaignForAdminView(null);
        setActiveMainTab("campaigns"); 
    }
  };

  const handleDownloadPlaceholder = (dataType: string) => {
    toast({
        title: `Download ${dataType} (Placeholder)`,
        description: `This feature is conceptual. In a real application, this would trigger a CSV download of all ${dataType.toLowerCase()}.`,
        duration: 5000,
    });
  };
  
  return (
    <>
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Oversee platform activity, manage users, and review campaigns.
        </p>
      </div>
      <Separator />

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="overview">Overview & Stats</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Oversight</TabsTrigger>
          <TabsTrigger value="flagged_content"><ShieldAlertIcon className="mr-1 h-4 w-4" />Flagged Content</TabsTrigger>
          <TabsTrigger value="data_export">Data Export</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
            {isLoadingStats || !stats ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(6)].map((_, i) => (
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
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
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
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2 text-xl">
                        <Trophy className="h-5 w-5 text-primary"/> XP Leaderboard
                    </CardTitle>
                    <CardDescription>Top 10 users by Creative XP.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingLeaderboard ? (
                        <div className="flex justify-center items-center min-h-[200px]">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-2">Loading leaderboard...</span>
                        </div>
                    ) : leaderboardUsers.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No user data available for leaderboard.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Rank</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-center">Level</TableHead>
                                    <TableHead className="text-right">Total XP</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leaderboardUsers.map((user, index) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{index + 1}</TableCell>
                                        <TableCell>{user.name || 'Anonymous User'}</TableCell>
                                        <TableCell className="text-center">{user.level || 1}</TableCell>
                                        <TableCell className="text-right">{user.totalXP || 0}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

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
              <CardDescription>View, manage, and moderate all campaigns on the platform. Click &quot;View&quot; on a campaign to see its details below.</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminCampaignList 
                allCampaigns={allCampaigns}
                isLoadingCampaigns={isLoadingCampaigns}
                campaignFetchError={campaignFetchError}
                onCampaignAction={handleAdminCampaignAction} 
                onCampaignDeleted={handleAdminCampaignDeleted}
              />
            </CardContent>
          </Card>
        </TabsContent>

         <TabsContent value="flagged_content" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center gap-2"><MessageSquareWarning className="h-5 w-5 text-destructive"/>Flagged Content Versions</CardTitle>
              <CardDescription>Review and manage all content versions that have been flagged for moderation.</CardDescription>
            </CardHeader>
            <CardContent>
              <FlaggedContentTable 
                key={flaggedContentRefreshTrigger} 
                onViewCampaign={(campaignId) => handleAdminCampaignAction(campaignId, 'view')}
                onRefreshNeeded={handleRefreshFlaggedContent}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaign_detail_view" className="mt-6 space-y-6">
             {isFetchingCampaignDetail && (
                <div className="flex justify-center items-center min-h-[300px]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="ml-3">Loading campaign details...</p>
                </div>
            )}
            {!isFetchingCampaignDetail && !selectedCampaignForAdminView && (
                <Alert>
                    <Info className="h-5 w-5"/>
                    <AlertTitle>No Campaign Selected</AlertTitle>
                    <AlertDescription>Please select a campaign from the &quot;Campaign Oversight&quot; tab to view its details here.</AlertDescription>
                </Alert>
            )}
            {selectedCampaignForAdminView && !isFetchingCampaignDetail && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-2xl flex items-center justify-between">
                                <span>Campaign: &quot;{selectedCampaignForAdminView.title}&quot;</span>
                                <Button variant="outline" size="sm" onClick={() => { setSelectedCampaignForAdminView(null); setActiveMainTab("campaigns");}}>
                                    <XCircle className="mr-2 h-4 w-4"/> Close Detail View
                                </Button>
                            </CardTitle>
                            <CardDescription>
                                User ID: {selectedCampaignForAdminView.userId} | Status: {selectedCampaignForAdminView.status}
                                {selectedCampaignForAdminView.isFlagged && <span className="ml-2 text-destructive font-semibold">(CAMPAIGN FLAGGED)</span>}
                            </CardDescription>
                            {selectedCampaignForAdminView.isFlagged && selectedCampaignForAdminView.adminModerationNotes && (
                                <p className="text-sm text-destructive">Campaign Admin Notes: {selectedCampaignForAdminView.adminModerationNotes}</p>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div><span className="font-semibold">Brief:</span> {selectedCampaignForAdminView.brief}</div>
                            {selectedCampaignForAdminView.targetAudience && <div><span className="font-semibold">Audience:</span> {selectedCampaignForAdminView.targetAudience}</div>}
                            {selectedCampaignForAdminView.tone && <div><span className="font-semibold">Tone:</span> {selectedCampaignForAdminView.tone}</div>}
                            {selectedCampaignForAdminView.contentGoals && selectedCampaignForAdminView.contentGoals.length > 0 && <div><span className="font-semibold">Goals:</span> {selectedCampaignForAdminView.contentGoals.join(', ')}</div>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-xl">Creative Strategy War Room</CardTitle>
                            <CardDescription>AI agents collaborate here to define the campaign strategy.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {selectedCampaignForAdminView.agentDebates && selectedCampaignForAdminView.agentDebates.length > 0 ? (
                                <AgentDebateDisplay debates={selectedCampaignForAdminView.agentDebates} />
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-muted-foreground mb-4">No strategy session has been run for this campaign yet.</p>
                                    <Button onClick={() => handleRunDebate(selectedCampaignForAdminView)} disabled={isDebating}>
                                        {isDebating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4"/>}
                                        {isDebating ? 'Agents are Debating...' : 'Start Strategy Session'}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                         <CardHeader>
                            <CardTitle>Content Versions</CardTitle>
                            <CardDescription>View generated content versions and use tools to revise them.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {selectedCampaignForAdminView.contentVersions && selectedCampaignForAdminView.contentVersions.length > 0 ? (
                                selectedCampaignForAdminView.contentVersions.map((version) => (
                                  <Card key={version.id} className="bg-muted/30">
                                    <CardHeader>
                                      <CardTitle className="text-base flex justify-between items-center">
                                        <span>Version {version.versionNumber}</span>
                                        <Button size="sm" variant="outline" onClick={() => handleOpenReviseDialog(version)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Revise Content
                                        </Button>
                                      </CardTitle>
                                      <CardDescription>
                                        By: {version.actorName} on {format(new Date(version.timestamp), "MMM d, yyyy 'at' p")}
                                      </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="font-medium text-sm mb-2">Change Summary: <span className="font-normal">{version.changeSummary}</span></p>
                                        <div className="space-y-2">
                                            {Object.entries(version.multiFormatContentSnapshot).map(([format, text]) =>
                                                text ? (
                                                    <details key={format}>
                                                        <summary className="text-sm font-semibold cursor-pointer">{format.replace(/([A-Z])/g, ' $1').trim()}</summary>
                                                        <pre className="mt-1 whitespace-pre-wrap text-xs p-2 border rounded bg-background max-h-48 overflow-y-auto">{text}</pre>
                                                    </details>
                                                ) : null
                                            )}
                                        </div>
                                    </CardContent>
                                  </Card>
                                ))
                            ): <p className="text-sm text-muted-foreground text-center py-4">No content versions recorded for this campaign.</p>}
                        </CardContent>
                    </Card>
                </>
            )}
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

    {/* Revise Content Dialog */}
    <Dialog open={isReviseDialogOpen} onOpenChange={setIsReviseDialogOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BotMessageSquare /> AI Content Revision</DialogTitle>
          <DialogDescription>
            Fine-tune content for a specific tone or audience. Original from: {contentToRevise?.versionInfo}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="original-content">Original Content</Label>
                    <Textarea id="original-content" value={contentToRevise?.originalContent || ''} readOnly rows={8} className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="revision-instructions">Revision Instructions</Label>
                    <Textarea 
                      id="revision-instructions"
                      value={revisionInstructions}
                      onChange={e => setRevisionInstructions(e.target.value)}
                      placeholder="e.g., Make this more persuasive for Gen Z. Add more data points. Shorten the paragraphs."
                      rows={4}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="revision-audience">Target Audience (Optional)</Label>
                        <Input id="revision-audience" value={revisionAudience} onChange={e => setRevisionAudience(e.target.value)} placeholder="e.g., Tech enthusiasts"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="revision-tone">Desired Tone (Optional)</Label>
                        <Input id="revision-tone" value={revisionTone} onChange={e => setRevisionTone(e.target.value)} placeholder="e.g., Playful, formal" />
                    </div>
                </div>
                 <Button onClick={handleReviseContent} disabled={isRevising || !revisionInstructions}>
                    {isRevising && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Revise with AI
                </Button>
            </div>
            <div className="space-y-2">
                 <Label htmlFor="revision-result">Revised Content</Label>
                 {isRevising ? (
                    <div className="flex flex-col items-center justify-center h-full border rounded-md bg-muted/50 p-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-2 text-sm text-muted-foreground">AI is working its magic...</p>
                    </div>
                 ) : (
                    <Textarea 
                      id="revision-result" 
                      value={revisionResult || 'AI revision will appear here...'} 
                      readOnly 
                      rows={15}
                      className={revisionResult ? 'bg-green-50 dark:bg-green-900/20' : 'bg-muted/50'}
                    />
                 )}
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsReviseDialogOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
