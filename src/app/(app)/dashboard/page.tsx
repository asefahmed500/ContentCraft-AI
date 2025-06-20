
"use client";

import { useState, useCallback, useEffect } from 'react';
import { BrandDNAAnalyzer } from './components/BrandDNAAnalyzer';
import { AgentDebatePanel } from './components/AgentDebatePanel';
import { MultiFormatPreview } from './components/MultiFormatPreview';
import { CampaignGenerator } from './components/CampaignGenerator';
import { ContentEvolutionTimeline } from './components/ContentEvolutionTimeline';
import { PerformancePredictor } from './components/PerformancePredictor';
import { CampaignList } from './components/CampaignList'; 
import { TemplateLibrary } from './components/TemplateLibrary';
import { ContentCalendarView } from './components/ContentCalendarView';
import { ABTestingPanel } from './components/ABTestingPanel';
import type { AgentDebateInput, AgentDebateOutput } from '@/ai/flows/agent-debate';
import { agentDebate } from '@/ai/flows/agent-debate';
import type { GenerateContentInput, GenerateContentOutput } from '@/ai/flows/content-generation';
import { generateContent } from '@/ai/flows/content-generation';
import type { AgentRole } from '@/types/agent';
import type { MultiFormatContent, CampaignStatus, Campaign, ContentVersion, AgentInteraction } from '@/types/content';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fingerprint, Users, Bot, Library, FileText, Activity, TrendingUp, BadgeCheck, ListChecks, Lightbulb, Edit, MessageSquareWarning, ShieldCheck, SearchCheck, Brain, BarChartBig, CalendarDays, TestTubeDual } from 'lucide-react';

async function agentDebateAction(input: AgentDebateInput): Promise<AgentDebateOutput | { error: string }> {
  try {
    const result = await agentDebate(input);
    return result;
  } catch (error) {
    console.error("Error in agentDebateAction:", error);
    return { error: error instanceof Error ? error.message : "An unknown error occurred during debate." };
  }
}

async function generateContentAction(input: GenerateContentInput): Promise<GenerateContentOutput | { error: string }> {
  try {
    const result = await generateContent(input);
    return result;
  } catch (error) {
    console.error("Error in generateContentAction:", error);
    return { error: error instanceof Error ? error.message : "An unknown error occurred during content generation." };
  }
}

async function updateCampaignAPI(campaignId: string, updates: Partial<Campaign>): Promise<Campaign | { error: string }> {
  try {
    const response = await fetch(`/api/campaigns?id=${campaignId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update campaign');
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating campaign:", error);
    return { error: error instanceof Error ? error.message : "An unknown error occurred." };
  }
}


export default function DashboardPage() {
  const [multiFormatContent, setMultiFormatContent] = useState<MultiFormatContent | null>(null);
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [isDebating, setIsDebating] = useState(false);
  const [currentDebateTopic, setCurrentDebateTopic] = useState<string | undefined>(undefined);
  const [refreshCampaignListTrigger, setRefreshCampaignListTrigger] = useState(0);
  
  const [selectedCampaignForProcessing, setSelectedCampaignForProcessing] = useState<Campaign | null>(null); 
  const [selectedCampaignForEditingInForm, setSelectedCampaignForEditingInForm] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState("campaign-hub");


  const { toast } = useToast();

  const agentRolesForDebate: AgentRole[] = ["Creative Director", "Content Writer", "Brand Persona", "Analytics Strategist", "SEO Optimization", "Quality Assurance", "Orchestrator"];
  const orchestratorAgentName: AgentInteraction['agent'] = "Orchestrator";


  const handleNewCampaignCreatedOrUpdated = useCallback((campaign: Campaign) => {
    setRefreshCampaignListTrigger(prev => prev + 1); 
    setSelectedCampaignForProcessing(campaign); 
    setSelectedCampaignForEditingInForm(null); 
    // setActiveTab('campaign-hub'); // Commented out to stay on generator or move to preview later
    
    // If it's a new campaign or a different campaign was edited, clear previous multiFormatContent
    if (!selectedCampaignForEditingInForm || selectedCampaignForEditingInForm.id !== campaign.id) {
        setMultiFormatContent(null);
    } else { // If the same campaign was edited, update its preview
        const latestVersion = campaign.contentVersions && campaign.contentVersions.length > 0 
            ? campaign.contentVersions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
            : null;
        setMultiFormatContent(latestVersion ? latestVersion.multiFormatContentSnapshot : null);
    }
  }, [selectedCampaignForEditingInForm]);
  
  const persistCurrentCampaignUpdates = useCallback(async (campaignToPersist?: Campaign | null) => {
    const campaign = campaignToPersist || selectedCampaignForProcessing;
    if (!campaign || !campaign.id) return campaign; // Return null or the campaign if no ID

    // Ensure all date fields are actual Date objects before sending
    const sanitizedCampaign = {
        ...campaign,
        createdAt: campaign.createdAt ? new Date(campaign.createdAt) : new Date(),
        updatedAt: new Date(), // Always set updatedAt to current time on save
        agentDebates: (campaign.agentDebates || []).map(ad => ({...ad, timestamp: ad.timestamp ? new Date(ad.timestamp) : new Date()})),
        contentVersions: (campaign.contentVersions || []).map(cv => ({...cv, timestamp: cv.timestamp ? new Date(cv.timestamp) : new Date()})),
        scheduledPosts: (campaign.scheduledPosts || []).map(sp => ({...sp, scheduledAt: sp.scheduledAt ? new Date(sp.scheduledAt) : new Date()})),
        abTests: (campaign.abTests || []).map(ab => ({...ab, createdAt: ab.createdAt ? new Date(ab.createdAt) : new Date()})),
    };
    
    const result = await updateCampaignAPI(campaign.id, sanitizedCampaign);
    if ('error' in result) {
        toast({ title: "Failed to Save Campaign Updates", description: result.error, variant: "destructive"});
        return campaign; // Return original campaign on error
    } else {
        setSelectedCampaignForProcessing(result); 
        setRefreshCampaignListTrigger(prev => prev + 1); 
        return result; // Return updated campaign
    }
  }, [selectedCampaignForProcessing, toast]);


  const handleGenerateContentForCampaign = useCallback(async (
    campaign: Campaign,
    brandVoiceOverride?: string,
  ) => {
    if(!campaign || !campaign.id) {
        toast({title: "Error", description: "No campaign selected to generate content.", variant: "destructive"});
        return;
    }

    setIsGeneratingCampaign(true);
    setIsDebating(true);
    
    let currentCampaignState: Campaign = {
        ...campaign, 
        status: 'debating' as CampaignStatus, 
        agentDebates: [], 
        contentVersions: campaign.contentVersions || [] // Preserve existing versions if any (e.g. re-generating)
    };
    // Clear previous live content for this new generation cycle
    setMultiFormatContent(null); 
    
    // Persist initial "debating" status
    currentCampaignState = await persistCurrentCampaignUpdates(currentCampaignState) || currentCampaignState;
    setSelectedCampaignForProcessing(currentCampaignState);
    
    const displayTitle = campaign.title.substring(0, 50);
    const campaignTitleForDebate = `Debate for: "${displayTitle}..."`;
    setCurrentDebateTopic(campaignTitleForDebate);
    setActiveTab('debate');

    toast({ title: "Campaign Processing Started", description: `Agents are now debating strategy for "${campaign.title}".` });

    try {
      let augmentedBrief = `Campaign Title: ${campaign.title}\nProduct/Service Description: ${campaign.brief}`;
      if (campaign.targetAudience) augmentedBrief += `\nTarget Audience: ${campaign.targetAudience}`;
      if (campaign.tone) augmentedBrief += `\nDesired Tone: ${campaign.tone}`;
      if (campaign.contentGoals && campaign.contentGoals.length > 0) augmentedBrief += `\nContent Goals: ${campaign.contentGoals.join(', ')}`;

      const debateInput: AgentDebateInput = {
        topic: `Formulate content strategy for a campaign about: ${augmentedBrief}. Consider key messages, angles, potential pitfalls, and content formats. Each agent should offer specific, actionable feedback or proposals.`,
        initialContent: augmentedBrief,
        agentRoles: agentRolesForDebate.filter(r => r !== 'Orchestrator'), 
      };
      const debateResult = await agentDebateAction(debateInput);

      if ('error' in debateResult) {
        throw new Error(`Debate failed: ${debateResult.error}`);
      }
      
      const debateInteractions: AgentInteraction[] = [];
      debateInteractions.push({ agent: orchestratorAgentName, agentName: orchestratorAgentName, agentId: 'orchestrator-01', type: 'statement', role: 'Orchestrator', message: `Debate initiated for campaign: "${campaign.title}". Agents: ${debateInput.agentRoles.join(', ')}. Focus: Strategy & Key Messaging.`, timestamp: new Date()});
      debateInteractions.push({ agent: 'Creative Director', agentName: 'Creative Director', agentId: 'cd-01', type: 'statement', role: 'Creative Director', message: `Initial direction: ${debateResult.contentSuggestions[0] || 'Focus on a strong narrative around the product benefits.'}`, timestamp: new Date() });
      debateInteractions.push({ agent: 'Content Writer', agentName: 'Content Writer', agentId: 'cw-01', type: 'statement', role: 'Content Writer', message: `Headline Idea: "${campaign.title} - Unveiling the Future!" or perhaps "Experience ${campaign.brief.substring(0,30)}...". Looking for a concise yet impactful headline.`, timestamp: new Date()});
      debateInteractions.push({ agent: 'Brand Persona', agentName: 'Brand Persona', agentId: 'bp-01', type: 'critique', role: 'Brand Persona', message: `Critique from Brand Persona: The initial direction needs to align better with ${campaign.targetAudience || 'the target audience'}. It might be perceived as too generic. Needs more edge and authenticity. Suggestion: ${debateResult.contentSuggestions[1] || 'Incorporate more user-generated content styles.'}`, timestamp: new Date() });
      debateInteractions.push({ agent: 'Analytics Strategist', agentName: 'Analytics Strategist', agentId: 'as-01', type: 'suggestion', role: 'Analytics Strategist', message: `Data Insight: Content including 'user-generated feel' for similar campaigns targeting ${campaign.targetAudience || 'the target audience'} sees a 30% higher engagement. Consider incorporating this.`, timestamp: new Date() });
      debateInteractions.push({ agent: 'SEO Optimization', agentName: 'SEO Optimization', agentId: 'seo-01', type: 'suggestion', role: 'SEO Optimization', message: `SEO Suggestion: For blog/LinkedIn, target keywords like '${campaign.title.toLowerCase().replace(/\s/g, '-')}' and related terms like '${campaign.targetAudience?.toLowerCase() || 'audience-specific'} marketing'. Consider a primary keyword density of 1-2%.`, timestamp: new Date() });
      debateInteractions.push({ agent: 'Quality Assurance', agentName: 'Quality Assurance', agentId: 'qa-01', type: 'critique', role: 'Quality Assurance', message: `QA Check: All claims made in the content must be verifiable and adhere to advertising standards (e.g., FTC guidelines if applicable). If specific health or financial claims are made, ensure they are backed by evidence and comply with relevant regulations. For example, avoid absolute statements like "guaranteed results" unless provable. Brand tone guidelines emphasize clarity and honesty.`, timestamp: new Date() });
      debateInteractions.push({ agent: orchestratorAgentName, agentName: orchestratorAgentName, agentId: 'orchestrator-02', type: 'statement', role: 'Orchestrator', message: `Debate Summary: ${debateResult.debateSummary}\nKey Suggestions & Consensus: ${debateResult.contentSuggestions.join('; ')}\nProceeding to content generation.`, timestamp: new Date()});
      
      currentCampaignState = {...currentCampaignState, agentDebates: debateInteractions, status: 'generating' as CampaignStatus};
      currentCampaignState = await persistCurrentCampaignUpdates(currentCampaignState) || currentCampaignState;
      setSelectedCampaignForProcessing(currentCampaignState);
      
      setIsDebating(false); 
      toast({ title: "Debate Phase Complete", description: "Agents have concluded the strategy session. Now generating multi-format content." });
      setActiveTab('preview');


      const contentInput: GenerateContentInput = {
        inputContent: `${augmentedBrief}\n\nKey insights from debate: ${debateResult.debateSummary}\nKey Suggestions and Agreements: ${debateResult.contentSuggestions.join('; ')}`,
        brandVoice: brandVoiceOverride, 
      };
      const contentResult = await generateContentAction(contentInput);

      if ('error' in contentResult) {
        throw new Error(`Content generation failed: ${contentResult.error}`);
      }

      setMultiFormatContent(contentResult);
      const newVersionNumber = (currentCampaignState.contentVersions?.length || 0) + 1;
      const newVersion: ContentVersion = {
        id: `v${newVersionNumber}-${new Date().getTime()}`, 
        versionNumber: newVersionNumber,
        timestamp: new Date(),
        actorName: "AI Team (Final Draft)", 
        changeSummary: "Initial multi-format content generated based on brief and agent debate.",
        multiFormatContentSnapshot: contentResult,
      };
      
      currentCampaignState = {
        ...currentCampaignState, 
        contentVersions: [...(currentCampaignState.contentVersions || []), newVersion],
        status: 'review' as CampaignStatus
      };
      currentCampaignState = await persistCurrentCampaignUpdates(currentCampaignState) || currentCampaignState;
      setSelectedCampaignForProcessing(currentCampaignState);
      toast({ title: "Content Generation Complete!", description: "Your final draft of multi-format content is ready for preview. (+50 XP)" });
      
    } catch (error) {
      console.error("Campaign Generation Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Campaign Generation Failed", description: errorMessage, variant: "destructive" });
       if (selectedCampaignForProcessing && selectedCampaignForProcessing.id) { 
            const tempCamp = {...selectedCampaignForProcessing, status: 'draft' as CampaignStatus, agentDebates: selectedCampaignForProcessing.agentDebates || [], contentVersions: selectedCampaignForProcessing.contentVersions || []}; // Keep existing debates/versions if error occurs mid-process
            setSelectedCampaignForProcessing(tempCamp);
            await persistCurrentCampaignUpdates(tempCamp);
       }
      setIsDebating(false);
    } finally {
      setIsGeneratingCampaign(false); 
    }
  }, [selectedCampaignForProcessing, persistCurrentCampaignUpdates, toast, agentRolesForDebate, orchestratorAgentName]);


  const handleViewVersion = useCallback((version: ContentVersion) => {
    setMultiFormatContent(version.multiFormatContentSnapshot);
    setActiveTab('preview');
    toast({title: `Viewing Version ${version.versionNumber}`, description: `Displaying content snapshot from ${new Date(version.timestamp).toLocaleString()}`});
  }, [toast]);


  const handleCampaignSelectionFromList = useCallback(async (campaignId: string | null, action: 'view' | 'edit') => {
    setSelectedCampaignForEditingInForm(null); 

    if (!campaignId) {
      setSelectedCampaignForProcessing(null);
      // Do not change tab if just clearing selection, user might be on 'generator' tab
      // setActiveTab('campaign-hub'); 
      return;
    }

    try {
      // It's better to fetch the specific campaign directly if possible, or find from a list if already fetched by CampaignList
      // For now, assuming CampaignList provides enough data or we refetch.
      // This is a simplified fetch, ideally CampaignList would pass the full campaign object.
      const campaignsResponse = await fetch(`/api/campaigns`); // This fetches all, inefficient.
      if (!campaignsResponse.ok) throw new Error("Failed to fetch campaigns to find the selected one.");
      const campaigns: Campaign[] = await campaignsResponse.json();
      const campaignToSelect = campaigns.find(c => c.id === campaignId);

      if (!campaignToSelect) {
        toast({ title: "Error", description: "Campaign not found.", variant: "destructive" });
        return;
      }
      
      setSelectedCampaignForProcessing(campaignToSelect); 
      
      if (action === 'edit') {
        setSelectedCampaignForEditingInForm(campaignToSelect); 
        setActiveTab('generator'); 
        toast({ title: "Editing Campaign", description: `Loaded "${campaignToSelect.title}" for editing.`});
      } else if (action === 'view') {
        const latestVersion = campaignToSelect.contentVersions && campaignToSelect.contentVersions.length > 0 
            ? campaignToSelect.contentVersions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
            : null;

        if (latestVersion) {
             toast({ title: "Viewing Campaign", description: `Displaying latest content for "${campaignToSelect.title}".`});
             setMultiFormatContent(latestVersion.multiFormatContentSnapshot); // Ensure preview updates
             setActiveTab('preview');
        } else if (['draft', 'debating', 'generating'].includes(campaignToSelect.status) ) {
            toast({ title: `Campaign Status: ${campaignToSelect.status}`, description: `Generate content for "${campaignToSelect.title}" or edit the brief.`});
            setSelectedCampaignForEditingInForm(campaignToSelect); 
            setMultiFormatContent(null); // Clear preview for draft/generating
            setActiveTab('generator');
        } else { 
            toast({ title: "Viewing Campaign", description: `No content versions found for "${campaignToSelect.title}". Consider re-generating or editing.`});
            setSelectedCampaignForEditingInForm(campaignToSelect);
            setMultiFormatContent(null); // Clear preview
            setActiveTab('generator');
        }
      }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load campaign details.";
        toast({ title: "Error Loading Campaign", description: errorMessage, variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if (selectedCampaignForProcessing) {
        setCurrentDebateTopic(`Debate for: "${selectedCampaignForProcessing.title.substring(0, 70)}${selectedCampaignForProcessing.title.length > 70 ? "..." : ""}"`);
        
        const latestVersion = selectedCampaignForProcessing.contentVersions && selectedCampaignForProcessing.contentVersions.length > 0 
            ? selectedCampaignForProcessing.contentVersions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
            : null;
        setMultiFormatContent(latestVersion ? latestVersion.multiFormatContentSnapshot : null);

        if (selectedCampaignForProcessing.status === 'debating') {
            setIsDebating(true);
        } else {
            setIsDebating(false);
        }
        if (selectedCampaignForProcessing.status === 'generating' || selectedCampaignForProcessing.status === 'debating') {
            setIsGeneratingCampaign(true);
        } else {
            setIsGeneratingCampaign(false);
        }

    } else {
        setCurrentDebateTopic(undefined);
        setMultiFormatContent(null);
        setIsDebating(false);
        setIsGeneratingCampaign(false);
        setSelectedCampaignForEditingInForm(null); // Clear edit form if no campaign is selected
    }
  }, [selectedCampaignForProcessing]);


  const campaignStatus = selectedCampaignForProcessing?.status || 'draft';
  const debateMessages = selectedCampaignForProcessing?.agentDebates || [];
  const contentVersions = selectedCampaignForProcessing?.contentVersions || [];
  const latestContentVersionId = contentVersions.length > 0 ? contentVersions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].id : undefined;


  const getStatusBadgeIcon = (status: CampaignStatus) => {
    switch(status) {
      case 'draft': return <Lightbulb className="h-4 w-4 text-gray-500"/>;
      case 'debating': return <Users className="h-4 w-4 text-blue-500 animate-pulse"/>;
      case 'generating': return <Brain className="h-4 w-4 text-purple-500 animate-spin"/>; 
      case 'review': return <FileText className="h-4 w-4 text-yellow-500"/>; 
      case 'published': return <BadgeCheck className="h-4 w-4 text-green-500"/>;
      case 'archived': return <Library className="h-4 w-4 text-gray-400"/>;
      default: return <Lightbulb className="h-4 w-4 text-gray-500"/>;
    }
  };
  
  const campaignStatusTextMap: Record<CampaignStatus, string> = {
    draft: "Draft",
    debating: "Agents Debating Strategy...",
    generating: "AI Generating Content...",
    review: "Ready for Review", 
    published: "Published",
    archived: "Archived"
  };

  const hasContentForPreview = multiFormatContent && Object.values(multiFormatContent).some(v => v && typeof v === 'string' && v.length > 0);
  const hasContentForPerformance = multiFormatContent && Object.values(multiFormatContent).some(v => v && typeof v === 'string' && v.length > 0);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">ContentCraft AI Dashboard</h1>
            <p className="text-lg text-muted-foreground">
            Orchestrate your AI creative team for powerful, multi-format content campaigns.
            </p>
        </div>
        {selectedCampaignForProcessing && (
            <div className="flex items-center gap-2 p-2 border rounded-md bg-card min-w-[220px] justify-center shadow">
                {getStatusBadgeIcon(campaignStatus)}
                <span className="text-sm font-medium">{campaignStatusTextMap[campaignStatus]}</span>
            </div>
        )}
      </div>
      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-1 h-auto flex-wrap p-1">
          <TabsTrigger value="campaign-hub" className="text-xs sm:text-sm"><ListChecks className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Campaigns</TabsTrigger>
          <TabsTrigger value="generator" className="text-xs sm:text-sm"><Lightbulb className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />{selectedCampaignForEditingInForm ? "Edit" : "New"} Brief</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs sm:text-sm"><Library className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Templates</TabsTrigger>
          <TabsTrigger value="brand" className="text-xs sm:text-sm"><Fingerprint className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Brand DNA</TabsTrigger>
          <TabsTrigger value="debate" className="text-xs sm:text-sm" disabled={!selectedCampaignForProcessing || (campaignStatus === 'draft' && debateMessages.length === 0) }><Users className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />War Room</TabsTrigger>
          <TabsTrigger value="preview" className="text-xs sm:text-sm" disabled={!selectedCampaignForProcessing || !hasContentForPreview}><FileText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Preview</TabsTrigger>
          <TabsTrigger value="evolution" className="text-xs sm:text-sm" disabled={!selectedCampaignForProcessing || contentVersions.length === 0}><Activity className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Evolution</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs sm:text-sm" disabled={!selectedCampaignForProcessing || !hasContentForPerformance}><BarChartBig className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Performance</TabsTrigger>
          <TabsTrigger value="ab-testing" className="text-xs sm:text-sm" disabled={!selectedCampaignForProcessing}><TestTubeDual className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />A/B Tests</TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs sm:text-sm"><CalendarDays className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="campaign-hub" className="mt-6">
           <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><ListChecks className="h-6 w-6 text-primary"/>Your Campaigns</CardTitle>
                    <CardDescription>View, edit, or manage your existing content campaigns. Select a campaign to start or create a new one using the &quot;New Brief&quot; tab.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CampaignList 
                        refreshTrigger={refreshCampaignListTrigger} 
                        onCampaignSelect={handleCampaignSelectionFromList} 
                    />
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="generator" className="mt-6">
            <CampaignGenerator 
                onCampaignCreated={handleNewCampaignCreatedOrUpdated} 
                onGenerateContentForCampaign={handleGenerateContentForCampaign}
                isGenerating={isGeneratingCampaign}
                selectedCampaignForEdit={selectedCampaignForEditingInForm} 
            />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
            <TemplateLibrary />
        </TabsContent>
        
        <TabsContent value="brand" className="mt-6">
          <BrandDNAAnalyzer />
        </TabsContent>

        <TabsContent value="debate" className="mt-6">
             <AgentDebatePanel 
                debateMessages={debateMessages.map(interaction => ({ 
                    agentId: interaction.agentId || `agent-${interaction.agent.replace(/\s+/g, '-').toLowerCase()}`,
                    agentName: interaction.agentName || interaction.agent,
                    agentRole: interaction.role || agentRolesForDebate.find(r => interaction.agent.toLowerCase().includes(r.split(' ')[0].toLowerCase())) || 'Orchestrator', 
                    message: interaction.message,
                    timestamp: new Date(interaction.timestamp),
                    type: interaction.type || 'statement' 
                }))} 
                isDebating={isDebating && campaignStatus === 'debating'} 
                debateTopic={currentDebateTopic} 
             />
        </TabsContent>
        
        <TabsContent value="preview" className="mt-6">
            <MultiFormatPreview 
                content={multiFormatContent} 
                isLoading={isGeneratingCampaign && (campaignStatus === 'generating' || campaignStatus === 'debating') && !multiFormatContent} 
                campaignId={selectedCampaignForProcessing?.id}
                contentVersionId={latestContentVersionId}
            />
        </TabsContent>

        <TabsContent value="evolution" className="mt-6">
            <ContentEvolutionTimeline 
                versions={contentVersions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())} 
                onViewVersion={handleViewVersion}
            />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
            <PerformancePredictor 
                campaignId={selectedCampaignForProcessing?.id} 
                contentToAnalyze={multiFormatContent} 
            />
        </TabsContent>

         <TabsContent value="ab-testing" className="mt-6">
            <ABTestingPanel 
                campaignId={selectedCampaignForProcessing?.id}
                abTests={selectedCampaignForProcessing?.abTests || []}
            />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
            <ContentCalendarView />
        </TabsContent>
        
      </Tabs>
    </div>
  );
}
