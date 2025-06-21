
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { UserTable } from './components/UserTable';
import { AdminCampaignList } from './components/AdminCampaignList';
import { FlaggedContentTable } from './components/FlaggedContentTable'; 
import type { Campaign, ContentVersion } from '@/types/content';
import type { User as NextAuthUser } from 'next-auth';
import { BarChart, BrainCircuit, LineChart as LucideLineChart, Users, FileText, Activity, Zap, Brain, Download, Info, PieChart, ListTree, XCircle, MessageSquare, Trophy, ShieldAlert as ShieldAlertIcon, Lightbulb, ShieldQuestion, FileSearch } from 'lucide-react';
import { ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart as RechartsBarChart, Line, LineChart as RechartsLineChart, Pie, Cell, PieChart as RechartsPieChart } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AgentDebateDisplay } from '@/components/AgentDebateDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay } from 'date-fns';
import { useSession } from 'next-auth/react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface PlatformStats {
  totalUsers: number;
  totalCampaigns: number;
  activeUsersToday: number; 
  campaignsCreatedToday: number; 
  aiFlowsExecuted: number; 
  feedbackItemsSubmitted: number;
}

interface PlatformInsights {
    summary: string;
    keyObservations: string[];
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

interface QualityAuditResult {
  qualityScore: number;
  justification: string;
  recommendation: 'Looks Good' | 'Suggest Improvement' | 'Recommend Archiving' | 'Incomplete';
}

interface WeeklyActivityData {
    date: string;
    users: number;
    campaigns: number;
}

interface ContentFormatData {
    name: string;
    value: number;
}

const PIE_CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function AdminDashboardPage() {
  const { data: session, update: updateSession } = useSession();
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

  const [insights, setInsights] = useState<PlatformInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);

  // Chart data states
  const [weeklyActivityData, setWeeklyActivityData] = useState<WeeklyActivityData[]>([]);
  const [topContentFormatsData, setTopContentFormatsData] = useState<ContentFormatData[]>([]);


  // New states for AI agent features
  const [isAuditQualityOpen, setIsAuditQualityOpen] = useState(false);
  const [isAuditingQuality, setIsAuditingQuality] = useState(false);
  const [qualityAuditResult, setQualityAuditResult] = useState<QualityAuditResult | null>(null);

  const [isDataSummaryOpen, setIsDataSummaryOpen] = useState(false);
  const [isSummarizingData, setIsSummarizingData] = useState(false);
  const [dataSummary, setDataSummary] = useState<string | null>(null);
  const [exportDataType, setExportDataType] = useState<string>('');

  const generateChartData = useCallback((users: AdminUser[], campaigns: Campaign[]) => {
    // Generate Weekly Activity Data
    const weeklyData: WeeklyActivityData[] = [];
    const today = startOfDay(new Date());
    for (let i = 6; i >= 0; i--) {
        const day = subDays(today, i);
        const dayStr = format(day, "MMM d");
        const nextDay = subDays(today, i - 1);
        
        const usersOnDay = users.filter(u => 
            u.createdAt && new Date(u.createdAt) >= day && new Date(u.createdAt) < nextDay
        ).length;
        const campaignsOnDay = campaigns.filter(c => 
            c.createdAt && new Date(c.createdAt) >= day && new Date(c.createdAt) < nextDay
        ).length;

        weeklyData.push({ date: dayStr, users: usersOnDay, campaigns: campaignsOnDay });
    }
    setWeeklyActivityData(weeklyData);

    // Generate Top Content Formats Data
    const formatCounts: Record<string, number> = {};
    campaigns.forEach(c => {
        c.contentVersions.forEach(v => {
            Object.keys(v.multiFormatContentSnapshot).forEach(formatKey => {
                if (v.multiFormatContentSnapshot[formatKey as keyof typeof v.multiFormatContentSnapshot]) {
                    formatCounts[formatKey] = (formatCounts[formatKey] || 0) + 1;
                }
            });
        });
    });

    const formatData = Object.entries(formatCounts)
        .map(([name, value]) => ({ name: name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    setTopContentFormatsData(formatData);
  }, []);

  const fetchAllData = useCallback(async () => {
    setIsLoadingCampaigns(true);
    setIsLoadingLeaderboard(true);
    setIsLoadingStats(true);
    setIsLoadingInsights(true);
    try {
        const campaignsPromise = fetch('/api/admin/campaigns');
        const usersPromise = fetch('/api/admin/users');
        const insightsPromise = fetch('/api/admin/insights');

        const [campaignsResponse, usersResponse, insightsResponse] = await Promise.all([
            campaignsPromise, usersPromise, insightsPromise
        ]);

        if (!campaignsResponse.ok) throw new Error("Failed to fetch campaigns");
        const campaignsData: Campaign[] = await campaignsResponse.json();
        setAllCampaigns(campaignsData);

        if (!usersResponse.ok) throw new Error("Failed to fetch users");
        const usersData: AdminUser[] = await usersResponse.json();
        const usersWithDates = usersData.map(u => ({ ...u, createdAt: u.createdAt ? new Date(u.createdAt) : undefined }));
        const sortedUsers = usersWithDates.map(u => ({...u, totalXP: u.totalXP || 0, level: u.level || 1})).sort((a, b) => (b.totalXP!) - (a.totalXP!));
        setLeaderboardUsers(sortedUsers.slice(0, 10));

        if (!insightsResponse.ok) throw new Error("Failed to fetch AI insights");
        const insightsData = await insightsResponse.json();
        setInsights(insightsData.insights);
        setStats(insightsData.stats);

        generateChartData(usersWithDates, campaignsData);

    } catch (err) {
        console.error("Admin dashboard fetch error:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setCampaignFetchError(errorMessage);
        toast({ title: "Error fetching dashboard data", description: errorMessage, variant: "destructive" });
    } finally {
        setIsLoadingCampaigns(false);
        setIsLoadingLeaderboard(false);
        setIsLoadingStats(false);
        setIsLoadingInsights(false);
    }
  }, [toast, generateChartData]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

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
    await fetchAllData();
    if (selectedCampaignForAdminView) {
      const updatedCampaign = await fetchSingleCampaign(selectedCampaignForAdminView.id);
      if (updatedCampaign) setSelectedCampaignForAdminView(updatedCampaign);
    }
    updateSession();
  }, [fetchAllData, selectedCampaignForAdminView, fetchSingleCampaign, updateSession]);
  

  const handleAdminCampaignAction = useCallback(async (campaignId: string, action: 'view' | 'edit' | 'delete' | 'flag') => {
    if (action === 'view') {
        const campaignDetail = await fetchSingleCampaign(campaignId);
        if (campaignDetail) {
            setSelectedCampaignForAdminView(campaignDetail);
            setActiveMainTab("campaign_detail_view"); 
        } else {
            toast({title: "Error", description: "Could not find campaign details.", variant: "destructive"});
        }
    } else if (action === 'edit') {
        toast({title: "Edit Action (Admin)", description: `Admin edit for campaign ${campaignId} is conceptual. Campaign details can be viewed.`, variant: "default"});
    } else if (action === 'flag') { 
        await fetchAllData();
        if (selectedCampaignForAdminView && selectedCampaignForAdminView.id === campaignId) {
            const updatedCampaign = await fetchSingleCampaign(campaignId); 
            if (updatedCampaign) setSelectedCampaignForAdminView(updatedCampaign);
        }
    }
  }, [toast, fetchAllData, selectedCampaignForAdminView, fetchSingleCampaign]); 
  
  const handleAdminCampaignDeleted = (deletedCampaignId: string) => {
    setAllCampaigns(prev => prev.filter(c => c.id !== deletedCampaignId));
    if (selectedCampaignForAdminView && selectedCampaignForAdminView.id === deletedCampaignId) {
        setSelectedCampaignForAdminView(null);
        setActiveMainTab("campaigns"); 
    }
  };

  const handleRunQualityAudit = async () => {
    if (!selectedCampaignForAdminView) return;
    setIsAuditingQuality(true);
    setQualityAuditResult(null);
    setIsAuditQualityOpen(true);
    try {
        const response = await fetch(`/api/admin/campaigns/${selectedCampaignForAdminView.id}/quality-audit`, { method: 'POST' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to run campaign quality audit.');
        setQualityAuditResult(result);
    } catch (err) {
        toast({title: "Audit Failed", description: (err as Error).message, variant: "destructive"});
    } finally {
        setIsAuditingQuality(false);
    }
  };

  const handleDataExport = async (type: string) => {
    setExportDataType(type);
    setDataSummary(null);
    setIsSummarizingData(true);
    setIsDataSummaryOpen(true);
    try {
        const response = await fetch('/api/admin/data/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataType: type })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to generate data summary.');
        setDataSummary(result.summary);
    } catch (err) {
        toast({title: "Summary Failed", description: (err as Error).message, variant: "destructive"});
    } finally {
        setIsSummarizingData(false);
    }
  };

  const confirmDownloadPlaceholder = () => {
    toast({
        title: `Download ${exportDataType} (Placeholder)`,
        description: `This feature is conceptual. In a real application, this would trigger a CSV download.`,
        duration: 5000,
    });
    setIsDataSummaryOpen(false);
  };


  const formatTitle = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  };
  
  const getQualityColor = (score: number) => {
    if (score < 40) return 'text-destructive';
    if (score < 80) return 'text-orange-500';
    return 'text-green-500';
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2 text-xl"><Lightbulb className="h-5 w-5 text-primary"/>AI-Powered Insights</CardTitle>
                        <CardDescription>Smart Analytics Agent analyzing platform data.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingInsights ? (
                             <div className="space-y-3">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                             </div>
                        ) : insights ? (
                            <div>
                                <p className="font-semibold mb-2">{insights.summary}</p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    {insights.keyObservations.map((obs, i) => <li key={i}>{obs}</li>)}
                                </ul>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">Could not generate AI insights.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            {isLoadingStats || !stats ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    {[...Array(6)].map((_, i) => (
                         <Card key={i}><CardHeader><Skeleton className="h-4 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>
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
                      <CardTitle className="text-sm font-medium">New Users (24h)</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">+{stats.activeUsersToday}</div>
                      <p className="text-xs text-muted-foreground">Live data</p>
                    </CardContent>
                  </Card>
                  <Card className="xl:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">New Campaigns (24h)</CardTitle>
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">+{stats.campaignsCreatedToday}</div>
                      <p className="text-xs text-muted-foreground">Live data</p>
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
                        <CardTitle className="font-headline flex items-center gap-2 text-xl"><LucideLineChart className="h-5 w-5 text-primary"/>Weekly Activity</CardTitle>
                        <CardDescription>New users and campaigns created over the last 7 days.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsLineChart data={weeklyActivityData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <YAxis yAxisId="left" stroke="hsl(var(--primary))" fontSize={12} allowDecimals={false}/>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                    cursor={{fill: 'hsl(var(--muted))', fillOpacity: 0.3}}
                                />
                                <Legend wrapperStyle={{paddingTop: '20px'}} />
                                <Line yAxisId="left" type="monotone" dataKey="users" name="New Users" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
                                <Line yAxisId="left" type="monotone" dataKey="campaigns" name="New Campaigns" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--accent))" }} activeDot={{ r: 6 }} />
                            </RechartsLineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2 text-xl"><PieChart className="h-5 w-5 text-primary"/>Top Content Formats</CardTitle>
                        <CardDescription>Distribution of all generated content formats.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {topContentFormatsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie data={topContentFormatsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                                        {topContentFormatsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}/>
                                    <Legend wrapperStyle={{paddingTop: '20px'}}/>
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">No content generated yet.</div>
                        )}
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Creative War Room (Read-Only)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AgentDebateDisplay debates={selectedCampaignForAdminView.agentDebates} />
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2"><FileSearch className="h-5 w-5 text-primary" />AI Campaign Quality Auditor</CardTitle>
                                <CardDescription>Run an AI agent to assess campaign health and completeness.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-center">
                                 <Button onClick={handleRunQualityAudit} disabled={isAuditingQuality}>
                                    {isAuditingQuality ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldQuestion className="mr-2 h-4 w-4" />}
                                    {isAuditingQuality ? 'Auditing...' : 'Run Quality Audit'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>


                    <Card>
                         <CardHeader>
                            <CardTitle>Content Versions (Read-Only)</CardTitle>
                            <CardDescription>View generated content versions. Creative tools are available on the user's dashboard.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {selectedCampaignForAdminView.contentVersions && selectedCampaignForAdminView.contentVersions.length > 0 ? (
                                <Accordion type="single" collapsible className="w-full">
                                {selectedCampaignForAdminView.contentVersions.map((version) => (
                                    <AccordionItem value={`version-${version.versionNumber}`} key={version.id}>
                                        <AccordionTrigger>Version {version.versionNumber} by {version.actorName} - {format(new Date(version.timestamp), "MMM d, p")}</AccordionTrigger>
                                        <AccordionContent className="space-y-3">
                                            <p className="font-medium text-sm">Change Summary: <span className="font-normal text-muted-foreground">{version.changeSummary}</span></p>
                                            <div className="space-y-2">
                                                {Object.entries(version.multiFormatContentSnapshot).map(([format, text]) =>
                                                    text ? (
                                                        <details key={format}>
                                                            <summary className="text-sm font-semibold cursor-pointer">{formatTitle(format)}</summary>
                                                            <pre className="mt-1 whitespace-pre-wrap text-xs p-2 border rounded bg-background max-h-48 overflow-y-auto">{text}</pre>
                                                        </details>
                                                    ) : null
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                                </Accordion>
                            ): <p className="text-sm text-muted-foreground text-center py-4">No content versions recorded for this campaign.</p>}
                        </CardContent>
                    </Card>
                </>
            )}
        </TabsContent>

         <TabsContent value="data_export" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center gap-2"><Download className="h-5 w-5 text-primary"/>Smart Data Export</CardTitle>
              <CardDescription>Generate an AI summary before downloading platform data for backup or external analysis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert>
                    <ListTree className="h-5 w-5" />
                    <AlertTitle>Smart Export Feature</AlertTitle>
                    <AlertDescription>
                        Click a button to generate an AI summary of the data. The download itself remains a conceptual feature.
                    </AlertDescription>
                </Alert>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button variant="outline" onClick={() => handleDataExport("Campaigns")} className="w-full sm:w-auto">
                        <Brain className="mr-2 h-4 w-4"/>Summarize & Export Campaigns
                    </Button>
                    <Button variant="outline" onClick={() => handleDataExport("Feedback Logs")} className="w-full sm:w-auto">
                        <Brain className="mr-2 h-4 w-4"/>Summarize & Export Feedback
                    </Button>
                     <Button variant="outline" onClick={() => handleDataExport("Users")} className="w-full sm:w-auto">
                        <Brain className="mr-2 h-4 w-4"/>Summarize & Export Users
                    </Button>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

    {/* AI Agent Dialogs */}
    <Dialog open={isAuditQualityOpen} onOpenChange={setIsAuditQualityOpen}>
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><FileSearch />AI Campaign Quality Audit</DialogTitle>
                <DialogDescription>
                    Analysis of campaign &quot;{selectedCampaignForAdminView?.title}&quot;.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
            {isAuditingQuality ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Running quality audit...</p>
              </div>
            ) : qualityAuditResult ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="text-center">
                    <CardDescription>Overall Quality Score</CardDescription>
                    <CardTitle className={`text-5xl ${getQualityColor(qualityAuditResult.qualityScore)}`}>
                      {qualityAuditResult.qualityScore}
                      <span className="text-3xl text-muted-foreground">/100</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={qualityAuditResult.qualityScore} className="h-2" />
                  </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                      <CardTitle className="text-base">AI Recommendation: <span className="text-primary">{qualityAuditResult.recommendation}</span></CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{qualityAuditResult.justification}</p>
                    </CardContent>
                  </Card>
              </div>
            ) : (
              <p>No audit results available.</p>
            )}
          </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                 <Button onClick={handleRunQualityAudit} disabled={isAuditingQuality}>
                    {isAuditingQuality ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldQuestion className="mr-2 h-4 w-4"/>}
                    Re-run Audit
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={isDataSummaryOpen} onOpenChange={setIsDataSummaryOpen}>
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><BrainCircuit />AI Data Summary for {exportDataType}</DialogTitle>
                <DialogDescription>
                    An AI-generated summary of the data you are about to export.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 min-h-[12rem] flex items-center justify-center">
            {isSummarizingData ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p>Generating summary...</p>
                </div>
            ) : dataSummary ? (
                <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-md border">{dataSummary}</p>
            ) : (
                <p className="text-destructive">Could not generate a summary for this data.</p>
            )}
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={confirmDownloadPlaceholder} disabled={isSummarizingData || !dataSummary}>
                    <Download className="mr-2 h-4 w-4" />
                    Confirm Download (Conceptual)
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    </>
  );
}
