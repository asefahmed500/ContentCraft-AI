
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
import type { AgentRole, UIAgentMessage } from '@/types/agent';
import type { MultiFormatContent, CampaignStatus, Campaign, ContentVersion, AgentInteraction } from '@/types/content';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fingerprint, Users, Bot, Library, FileText, Activity, TrendingUp, BadgeCheck, ListChecks, Lightbulb, Edit, MessageSquareWarning, ShieldCheck, SearchCheck, Brain, BarChartBig, CalendarDays, TestTube, Wand2 } from 'lucide-react';

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
  const [selectedCampaignForProcessing, setSelectedCampaignForProcessing] = useState<Campaign | null>(null); 
  const [selectedCampaignForEditingInForm, setSelectedCampaignForEditingInForm] = useState<Campaign | null>(null);
  
  const [multiFormatContent, setMultiFormatContent] = useState<MultiFormatContent | null>(null);
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false); // Overall campaign generation (debate + content)
  const [isDebating, setIsDebating] = useState(false); // Specifically debate phase
  const [currentDebateTopic, setCurrentDebateTopic] = useState<string | undefined>(undefined);
  const [refreshCampaignListTrigger, setRefreshCampaignListTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("campaign-hub");

  const { toast } = useToast();

  const agentRolesForDebate: AgentRole[] = ["Creative Director", "Content Writer", "Brand Persona", "Analytics Strategist", "SEO Optimization", "Quality Assurance", "Orchestrator"];
  const orchestratorAgentName: AgentInteraction['agent'] = "Orchestrator";


  // Derived states from selectedCampaignForProcessing
  const campaignStatus: CampaignStatus = selectedCampaignForProcessing?.status || 'draft';
  const debateMessages: AgentInteraction[] = selectedCampaignForProcessing?.agentDebates || [];
  const contentVersions: ContentVersion[] = selectedCampaignForProcessing?.contentVersions?.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [];
  const latestContentVersion: ContentVersion | null = contentVersions.length > 0 ? contentVersions[0] : null;
  const latestContentVersionId: string | undefined = latestContentVersion?.id;

  useEffect(() => {
    if (selectedCampaignForProcessing) {
      setCurrentDebateTopic(`Debate for: "${selectedCampaignForProcessing.title.substring(0, 70)}${selectedCampaignForProcessing.title.length > 70 ? "..." : ""}"`);
      setMultiFormatContent(latestContentVersion ? latestContentVersion.multiFormatContentSnapshot : null);

      const currentStatus = selectedCampaignForProcessing.status;
      setIsDebating(currentStatus === 'debating');
      setIsGeneratingCampaign(currentStatus === 'generating' || currentStatus === 'debating');
    } else {
      setCurrentDebateTopic(undefined);
      setMultiFormatContent(null);
      setIsDebating(false);
      setIsGeneratingCampaign(false);
      setSelectedCampaignForEditingInForm(null); 
    }
  }, [selectedCampaignForProcessing, latestContentVersion]);


  const handleNewCampaignCreatedOrUpdated = useCallback((campaign: Campaign) => {
    setRefreshCampaignListTrigger(prev => prev + 1); 
    
    const campaignWithDefaults = { // Ensure defaults for arrays
        ...campaign,
        agentDebates: campaign.agentDebates || [],
        contentVersions: campaign.contentVersions || [],
        scheduledPosts: campaign.scheduledPosts || [],
        abTests: campaign.abTests || [],
    };
    setSelectedCampaignForProcessing(campaignWithDefaults); 
    setSelectedCampaignForEditingInForm(null); // Clear edit form after save
    
    // If it's a new campaign or not the one being edited, reset content preview
    if (!selectedCampaignForEditingInForm || selectedCampaignForEditingInForm.id !== campaign.id) {
        setMultiFormatContent(null);
    } else { // If it's the currently edited campaign, update its preview
        const latestVersion = campaignWithDefaults.contentVersions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        setMultiFormatContent(latestVersion ? latestVersion.multiFormatContentSnapshot : null);
    }
  }, [selectedCampaignForEditingInForm]);
  
  const persistCurrentCampaignUpdates = useCallback(async (campaignToPersist?: Campaign | null) => {
    const campaign = campaignToPersist || selectedCampaignForProcessing;
    if (!campaign || !campaign.id) return campaign; 

    const sanitizedCampaignData: Partial<Campaign> = { // Prepare only fields that API expects for update
        title: campaign.title,
        brief: campaign.brief,
        targetAudience: campaign.targetAudience,
        tone: campaign.tone,
        contentGoals: campaign.contentGoals,
        brandId: campaign.brandId,
        referenceMaterials: campaign.referenceMaterials,
        status: campaign.status,
        isPrivate: campaign.isPrivate,
        agentDebates: (campaign.agentDebates || []).map(ad => ({...ad, timestamp: new Date(ad.timestamp)})), // Ensure dates are Date objects
        contentVersions: (campaign.contentVersions || []).map(cv => ({...cv, timestamp: new Date(cv.timestamp)})),
        scheduledPosts: (campaign.scheduledPosts || []).map(sp => ({...sp, scheduledAt: new Date(sp.scheduledAt)})),
        abTests: (campaign.abTests || []).map(ab => ({...ab, createdAt: new Date(ab.createdAt)})),
        updatedAt: new Date(),
    };
    
    const result = await updateCampaignAPI(campaign.id, sanitizedCampaignData);
    if ('error' in result) {
        toast({ title: "Failed to Save Campaign Updates", description: result.error, variant: "destructive"});
        return campaign; 
    } else {
        const updatedCampaignWithDefaults = {
            ...result,
            agentDebates: result.agentDebates || [],
            contentVersions: result.contentVersions || [],
            scheduledPosts: result.scheduledPosts || [],
            abTests: result.abTests || [],
        };
        setSelectedCampaignForProcessing(updatedCampaignWithDefaults); 
        setRefreshCampaignListTrigger(prev => prev + 1); 
        return updatedCampaignWithDefaults; 
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

    setIsGeneratingCampaign(true); // True for the whole process
    setIsDebating(true); // True for debate phase
    
    let currentCampaignState: Campaign = {
        ...campaign, 
        status: 'debating' as CampaignStatus, 
        agentDebates: campaign.agentDebates || [], 
        contentVersions: campaign.contentVersions || [] 
    };
    setMultiFormatContent(null); // Clear previous content
    
    // Persist initial 'debating' status
    const updatedInitialCampaign = await persistCurrentCampaignUpdates(currentCampaignState);
    currentCampaignState = updatedInitialCampaign || currentCampaignState; // Use returned campaign if successful
    setSelectedCampaignForProcessing(currentCampaignState); // Update main state
    
    const displayTitle = campaign.title.substring(0, 50);
    const campaignTitleForDebate = `Debate for: "${displayTitle}..."`;
    setCurrentDebateTopic(campaignTitleForDebate); // For UI
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
      
      // Simulate diverse agent interactions based on debateResult
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
      const updatedCampaignAfterDebate = await persistCurrentCampaignUpdates(currentCampaignState);
      currentCampaignState = updatedCampaignAfterDebate || currentCampaignState;
      setSelectedCampaignForProcessing(currentCampaignState);
      
      setIsDebating(false); // Debate phase finished
      toast({ title: "Debate Phase Complete", description: "Agents have concluded the strategy session. Now generating multi-format content." });
      setActiveTab('preview');


      const contentInput: GenerateContentInput = {
        inputContent: `${augmentedBrief}\n\nKey insights from debate: ${debateResult.debateSummary}\nKey Suggestions and Agreements: ${debateResult.contentSuggestions.join('; ')}`,
        brandVoice: brandVoiceOverride, // Use override if provided
      };
      const contentResult = await generateContentAction(contentInput);

      if ('error' in contentResult) {
        throw new Error(`Content generation failed: ${contentResult.error}`);
      }

      setMultiFormatContent(contentResult); // Display generated content
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
      const finalUpdatedCampaign = await persistCurrentCampaignUpdates(currentCampaignState);
      // currentCampaignState = finalUpdatedCampaign || currentCampaignState; // No need to reassign if just for toast
      setSelectedCampaignForProcessing(finalUpdatedCampaign || currentCampaignState);
      toast({ title: "Content Generation Complete!", description: "Your final draft of multi-format content is ready for preview. (+50 XP)" });
      
    } catch (error) {
      console.error("Campaign Generation Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Campaign Generation Failed", description: errorMessage, variant: "destructive" });
       if (selectedCampaignForProcessing && selectedCampaignForProcessing.id) { 
            // Revert status to draft if generation fails mid-way
            const tempCamp = {
                ...selectedCampaignForProcessing, 
                status: 'draft' as CampaignStatus, 
            }; 
            setSelectedCampaignForProcessing(tempCamp); // Update UI optimistically
            await persistCurrentCampaignUpdates(tempCamp); // Persist status change
       }
      setIsDebating(false);
    } finally {
      setIsGeneratingCampaign(false); // Entire process finished or failed
    }
  }, [selectedCampaignForProcessing, persistCurrentCampaignUpdates, toast, agentRolesForDebate, orchestratorAgentName]);


  const handleViewVersion = useCallback((version: ContentVersion) => {
    setMultiFormatContent(version.multiFormatContentSnapshot);
    setActiveTab('preview');
    toast({title: `Viewing Version ${version.versionNumber}`, description: `Displaying content snapshot from ${new Date(version.timestamp).toLocaleString()}`});
  }, [toast]);


  const handleCampaignSelectionFromList = useCallback(async (campaignId: string | null, action: 'view' | 'edit') => {
    setSelectedCampaignForEditingInForm(null); // Reset edit form

    if (!campaignId) {
      setSelectedCampaignForProcessing(null); // Clear main selection
      setMultiFormatContent(null);
      return;
    }

    try {
      const campaignResponse = await fetch(`/api/campaigns?id=${campaignId}&single=true`); 
      if (!campaignResponse.ok) {
          const errorData = await campaignResponse.json();
          throw new Error(errorData.error || "Failed to fetch the selected campaign.");
      }
      const campaignToSelect: Campaign = await campaignResponse.json();

      if (!campaignToSelect) {
        toast({ title: "Error", description: "Campaign not found.", variant: "destructive" });
        return;
      }
      
      const campaignWithDefaults = {
        ...campaignToSelect,
        agentDebates: campaignToSelect.agentDebates || [],
        contentVersions: campaignToSelect.contentVersions || [],
        scheduledPosts: campaignToSelect.scheduledPosts || [],
        abTests: campaignToSelect.abTests || [],
      };
      setSelectedCampaignForProcessing(campaignWithDefaults); 
      
      if (action === 'edit') {
        setSelectedCampaignForEditingInForm(campaignWithDefaults); 
        setActiveTab('generator'); 
        toast({ title: "Editing Campaign", description: `Loaded "${campaignWithDefaults.title}" for editing.`});
      } else if (action === 'view') {
        const latestV = campaignWithDefaults.contentVersions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        setMultiFormatContent(latestV ? latestV.multiFormatContentSnapshot : null);

        if (latestV) {
             toast({ title: "Viewing Campaign", description: `Displaying latest content for "${campaignWithDefaults.title}".`});
             setActiveTab('preview');
        } else if (['draft', 'debating', 'generating'].includes(campaignWithDefaults.status) ) {
            toast({ title: `Campaign Status: ${campaignWithDefaults.status}`, description: `Generate content for "${campaignWithDefaults.title}" or edit the brief.`});
            setSelectedCampaignForEditingInForm(campaignWithDefaults); // Allow edit if no content yet
            setActiveTab('generator');
        } else { 
            toast({ title: "Viewing Campaign", description: `No content versions found for "${campaignWithDefaults.title}". Consider re-generating or editing.`});
            setSelectedCampaignForEditingInForm(campaignWithDefaults); // Allow edit
            setActiveTab('generator');
        }
      }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load campaign details.";
        toast({ title: "Error Loading Campaign", description: errorMessage, variant: "destructive" });
        setSelectedCampaignForProcessing(null); // Clear selection on error
        setMultiFormatContent(null);
    }
  }, [toast]);
  
  const campaignStatusTextMap: Record<CampaignStatus, string> = {
    draft: "Draft",
    debating: "Agents Debating Strategy...",
    generating: "AI Generating Content...",
    review: "Ready for Review", 
    published: "Published",
    archived: "Archived"
  };

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
  
  const hasContentForPreview = multiFormatContent && Object.values(multiFormatContent).some(v => v && typeof v === 'string' && v.length > 0);

  const handleRequestContentGenerationForPerformance = () => {
    if (selectedCampaignForProcessing) {
        handleGenerateContentForCampaign(selectedCampaignForProcessing);
        setActiveTab('preview'); 
    } else {
        toast({title: "No Campaign Selected", description: "Please select or create a campaign first.", variant: "destructive"});
    }
  };


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
          <TabsTrigger value="performance" className="text-xs sm:text-sm" disabled={!selectedCampaignForProcessing}><BarChartBig className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Performance</TabsTrigger>
          <TabsTrigger value="ab-testing" className="text-xs sm:text-sm" disabled={!selectedCampaignForProcessing}><TestTube className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />A/B Tests</TabsTrigger>
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
                        currentlySelectedCampaignId={selectedCampaignForProcessing?.id} 
                    />
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="generator" className="mt-6">
            <CampaignGenerator 
                onCampaignCreated={handleNewCampaignCreatedOrUpdated} 
                onGenerateContentForCampaign={handleGenerateContentForCampaign}
                isGenerating={isGeneratingCampaign} // Pass the overall generation flag
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
                    timestamp: new Date(interaction.timestamp), // Ensure it's a Date object
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
                versions={contentVersions} // Already sorted
                onViewVersion={handleViewVersion}
            />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
            <PerformancePredictor 
                campaignId={selectedCampaignForProcessing?.id} 
                contentToAnalyze={multiFormatContent}
                onGenerateContentRequest={handleRequestContentGenerationForPerformance}
                currentCampaignStatus={campaignStatus}
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

