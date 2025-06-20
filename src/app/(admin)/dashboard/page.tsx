
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { UserTable } from './components/UserTable';
import { AdminCampaignList } from './components/AdminCampaignList';
import { MultiFormatPreview } from '@/app/(app)/dashboard/components/MultiFormatPreview';
import { AgentDebatePanel } from '@/app/(app)/dashboard/components/AgentDebatePanel';
import { ContentEvolutionTimeline } from '@/app/(app)/dashboard/components/ContentEvolutionTimeline';
import type { Campaign, CampaignStatus, ContentVersion, AgentInteraction, MultiFormatContent } from '@/types/content';
import type { AgentRole } from '@/types/agent';
import { BarChart, LineChart as LucideLineChart, Users, FileText, Activity, Zap, Brain, Download, Info, PieChart, ListTree, Eye, Edit, XCircle, MessageSquare } from 'lucide-react';
import { ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart as RechartsBarChart, Line, LineChart as RechartsLineChart, Pie, Cell, PieChart as RechartsPieChart } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface PlatformStats {
  totalUsers: number;
  totalCampaigns: number;
  activeUsersToday: number; 
  campaignsCreatedToday: number; 
  aiFlowsExecuted?: number; 
  feedbackItemsSubmitted?: number;
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
      const campaignsWithDates = data.map(c => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        agentDebates: (c.agentDebates || []).map(ad => ({...ad, timestamp: new Date(ad.timestamp)})),
        contentVersions: (c.contentVersions || []).map(cv => ({
            ...cv, 
            timestamp: new Date(cv.timestamp),
            isFlagged: cv.isFlagged ?? false,
            adminModerationNotes: cv.adminModerationNotes ?? ''
        })),
        isFlagged: c.isFlagged ?? false,
        adminModerationNotes: c.adminModerationNotes ?? '',
      }));
      setAllCampaigns(campaignsWithDates);
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
      
      if (!usersResponse.ok) {
        throw new Error("Failed to fetch users for stats");
      }
      const usersData = await usersResponse.json();
      
      setStats({
        totalUsers: usersData.length,
        totalCampaigns: allCampaigns.length, 
        activeUsersToday: Math.floor(Math.random() * usersData.length / 2) + 1, 
        campaignsCreatedToday: Math.floor(Math.random() * 5) + 1, 
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

  useEffect(() => {
    fetchAllCampaigns();
  }, [fetchAllCampaigns]);

  useEffect(() => {
    if (allCampaigns.length > 0 || !isLoadingCampaigns) { 
        fetchStats();
    }
  }, [allCampaigns, isLoadingCampaigns, fetchStats]);


  const handleAdminCampaignAction = useCallback(async (campaignId: string, action: 'view' | 'edit' | 'delete' | 'flag') => {
    if (action === 'view') {
        setIsFetchingCampaignDetail(true);
        const campaignDetail = allCampaigns.find(c => c.id === campaignId);
        if (campaignDetail) {
            setSelectedCampaignForAdminView(campaignDetail);
            setActiveMainTab("campaign_detail_view"); 
            toast({title: "Campaign Loaded", description: `Viewing details for "${campaignDetail.title}"`});
        } else {
            toast({title: "Error", description: "Could not find campaign details.", variant: "destructive"});
        }
        setIsFetchingCampaignDetail(false);
    } else if (action === 'edit') {
        toast({title: "Edit Action (Admin)", description: `Admin edit for campaign ${campaignId} is conceptual. A dedicated admin edit form would be needed.`, variant: "default"});
    } else if (action === 'delete') {
        // The AdminCampaignList component now handles its own API call for deletion.
        // This callback will be used to update the allCampaigns state here.
        // This case is now primarily for completeness if onCampaignAction was used for delete, but handled by onCampaignDeleted.
    } else if (action === 'flag') {
        // This action is to refresh the main list if the currently viewed campaign is updated.
        await fetchAllCampaigns(true);
        if (selectedCampaignForAdminView && selectedCampaignForAdminView.id === campaignId) {
            const updatedCampaign = allCampaigns.find(c => c.id === campaignId) || await fetchSingleCampaign(campaignId);
            if (updatedCampaign) setSelectedCampaignForAdminView(updatedCampaign);
        }
    }
  }, [allCampaigns, toast, fetchAllCampaigns, selectedCampaignForAdminView]);
  
  const handleAdminCampaignDeleted = (deletedCampaignId: string) => {
    setAllCampaigns(prev => prev.filter(c => c.id !== deletedCampaignId));
    if (selectedCampaignForAdminView && selectedCampaignForAdminView.id === deletedCampaignId) {
        setSelectedCampaignForAdminView(null);
        setActiveMainTab("campaigns"); // Go back to campaigns list if viewed campaign was deleted
    }
  };
  
  const fetchSingleCampaign = async (campaignId: string): Promise<Campaign | null> => {
    try {
        // This assumes you might need a direct fetch if not in the list,
        // but typically the 'allCampaigns' should be up-to-date after any list-affecting action.
        const response = await fetch(`/api/admin/campaigns`); // Get all again and find
        if (!response.ok) throw new Error("Failed to fetch updated campaign details");
        const campaigns: Campaign[] = await response.json();
        const foundCampaign = campaigns.find(c => c.id === campaignId);
        return foundCampaign 
            ? { ...foundCampaign, createdAt: new Date(foundCampaign.createdAt), updatedAt: new Date(foundCampaign.updatedAt), agentDebates: (foundCampaign.agentDebates || []).map(ad => ({...ad, timestamp: new Date(ad.timestamp)})), contentVersions: (foundCampaign.contentVersions || []).map(cv => ({...cv, timestamp: new Date(cv.timestamp), isFlagged: cv.isFlagged ?? false, adminModerationNotes: cv.adminModerationNotes ?? ''})) } 
            : null;
    } catch (err) {
        toast({title: "Error fetching campaign", description: (err as Error).message, variant: "destructive"});
        return null;
    }
  };
  
  const handleContentVersionFlagged = (updatedCampaignFull: Campaign) => {
    // Update the main list of campaigns
    setAllCampaigns(prevAllCampaigns => 
        prevAllCampaigns.map(c => c.id === updatedCampaignFull.id ? {
            ...updatedCampaignFull,
            createdAt: new Date(updatedCampaignFull.createdAt),
            updatedAt: new Date(updatedCampaignFull.updatedAt),
            agentDebates: (updatedCampaignFull.agentDebates || []).map(ad => ({...ad, timestamp: new Date(ad.timestamp)})),
            contentVersions: (updatedCampaignFull.contentVersions || []).map(cv => ({
                ...cv, 
                timestamp: new Date(cv.timestamp),
                isFlagged: cv.isFlagged ?? false,
                adminModerationNotes: cv.adminModerationNotes ?? ''
            }))
        } : c)
    );
    // If the currently viewed campaign is the one that was updated, refresh its state
    if (selectedCampaignForAdminView && selectedCampaignForAdminView.id === updatedCampaignFull.id) {
        setSelectedCampaignForAdminView({
            ...updatedCampaignFull,
            createdAt: new Date(updatedCampaignFull.createdAt),
            updatedAt: new Date(updatedCampaignFull.updatedAt),
            agentDebates: (updatedCampaignFull.agentDebates || []).map(ad => ({...ad, timestamp: new Date(ad.timestamp)})),
            contentVersions: (updatedCampaignFull.contentVersions || []).map(cv => ({
                ...cv, 
                timestamp: new Date(cv.timestamp),
                isFlagged: cv.isFlagged ?? false,
                adminModerationNotes: cv.adminModerationNotes ?? ''
            }))
        });
    }
    toast({title: "Version Moderation Updated", description: "Content version status has been reflected."});
  };


  const handleDownloadPlaceholder = (dataType: string) => {
    toast({
        title: `Download ${dataType} (Placeholder)`,
        description: `This feature is conceptual. In a real application, this would trigger a CSV download of all ${dataType.toLowerCase()}.`,
        duration: 5000,
    });
  };
  
  const debateMessagesForPreview: AgentInteraction[] = selectedCampaignForAdminView?.agentDebates || [];
  const contentVersionsForPreview: ContentVersion[] = (selectedCampaignForAdminView?.contentVersions || []).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const latestContentVersionForPreview: ContentVersion | null = contentVersionsForPreview[0] || null;
  const multiFormatContentForPreview: MultiFormatContent | null = latestContentVersionForPreview ? latestContentVersionForPreview.multiFormatContentSnapshot : null;


  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Oversee platform activity, manage users, and review campaigns.
        </p>
      </div>
      <Separator />

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Overview & Stats</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Oversight</TabsTrigger>
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
                                {selectedCampaignForAdminView.isFlagged && <span className="ml-2 text-destructive font-semibold">(FLAGGED)</span>}
                            </CardDescription>
                            {selectedCampaignForAdminView.isFlagged && selectedCampaignForAdminView.adminModerationNotes && (
                                <p className="text-sm text-destructive">Admin Notes: {selectedCampaignForAdminView.adminModerationNotes}</p>
                            )}
                        </CardHeader>
                        <CardContent>
                            <p><span className="font-semibold">Brief:</span> {selectedCampaignForAdminView.brief}</p>
                            {selectedCampaignForAdminView.targetAudience && <p><span className="font-semibold">Audience:</span> {selectedCampaignForAdminView.targetAudience}</p>}
                            {selectedCampaignForAdminView.tone && <p><span className="font-semibold">Tone:</span> {selectedCampaignForAdminView.tone}</p>}
                            {selectedCampaignForAdminView.contentGoals && selectedCampaignForAdminView.contentGoals.length > 0 && <p><span className="font-semibold">Goals:</span> {selectedCampaignForAdminView.contentGoals.join(', ')}</p>}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AgentDebatePanel
                             debateMessages={debateMessagesForPreview.map(interaction => ({
                                agentId: interaction.agentId || `agent-${interaction.agent.replace(/\s+/g, '-').toLowerCase()}`,
                                agentName: interaction.agentName || interaction.agent,
                                agentRole: (interaction.role || 'Orchestrator') as AgentRole,
                                message: interaction.message,
                                timestamp: new Date(interaction.timestamp),
                                type: interaction.type || 'statement'
                            }))}
                            isDebating={false} 
                            debateTopic={`Debate for: "${selectedCampaignForAdminView.title}"`}
                        />
                        <ContentEvolutionTimeline
                            versions={contentVersionsForPreview}
                            onViewVersion={(version) => {
                                // This updates the multiFormatContentForPreview by setting the new latest version
                                const campaignWithVersionAsLatest = {
                                    ...selectedCampaignForAdminView,
                                    contentVersions: [version, ...selectedCampaignForAdminView.contentVersions.filter(v => v.id !== version.id)].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                };
                                setSelectedCampaignForAdminView(campaignWithVersionAsLatest);
                                toast({title: `Admin viewing version ${version.versionNumber}`});
                            }}
                            campaignId={selectedCampaignForAdminView.id}
                            onVersionFlagged={handleContentVersionFlagged}
                        />
                    </div>
                    <MultiFormatPreview
                        content={multiFormatContentForPreview}
                        isLoading={false} 
                        campaignId={selectedCampaignForAdminView.id}
                        currentCampaign={selectedCampaignForAdminView}
                        currentContentVersion={latestContentVersionForPreview}
                        onFeedbackSubmittedSuccessfully={() => toast({title: "Admin Note", description: "Feedback panel is for user interaction. Admins moderate directly."})}
                    />
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
  );
}
