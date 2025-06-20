
"use client";

import { useState, useCallback, useEffect } from 'react';
import { BrandDNAAnalyzer } from './components/BrandDNAAnalyzer';
import { AgentDebatePanel } from './components/AgentDebatePanel';
import { MultiFormatPreview } from './components/MultiFormatPreview';
import { CampaignGenerator } from './components/CampaignGenerator';
import { ContentEvolutionTimeline } from './components/ContentEvolutionTimeline';
import { PerformancePredictor } from './components/PerformancePredictor';
import { CampaignList } from './components/CampaignList'; 
import type { AgentDebateInput, AgentDebateOutput } from '@/ai/flows/agent-debate';
import { agentDebate } from '@/ai/flows/agent-debate';
import type { GenerateContentInput, GenerateContentOutput } from '@/ai/flows/content-generation';
import { generateContent } from '@/ai/flows/content-generation';
import type { AgentMessage, AgentRole } from '@/types/agent';
import type { MultiFormatContent, CampaignStatus, Campaign, ContentVersion } from '@/types/content';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Users, Bot, Library, FileText, Activity, TrendingUp, BadgeCheck, ListChecks, Lightbulb, Edit } from 'lucide-react';

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

async function updateCampaignStatusAPI(campaignId: string, status: CampaignStatus, contentHistory?: ContentVersion[]): Promise<Campaign | { error: string }> {
  try {
    const payload: { status: CampaignStatus, contentHistory?: ContentVersion[] } = { status };
    if (contentHistory) {
      payload.contentHistory = contentHistory;
    }
    const response = await fetch(`/api/campaigns?id=${campaignId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
  const [debateMessages, setDebateMessages] = useState<AgentMessage[]>([]);
  const [multiFormatContent, setMultiFormatContent] = useState<MultiFormatContent | null>(null);
  const [contentHistory, setContentHistory] = useState<ContentVersion[]>([]);
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [isDebating, setIsDebating] = useState(false);
  const [currentDebateTopic, setCurrentDebateTopic] = useState<string | undefined>(undefined);
  const [currentCampaignOverallStatus, setCurrentCampaignOverallStatus] = useState<CampaignStatus>('draft');
  const [refreshCampaignListTrigger, setRefreshCampaignListTrigger] = useState(0);
  const [selectedCampaignForProcessing, setSelectedCampaignForProcessing] = useState<Campaign | null>(null); 
  const [selectedCampaignForEditingInForm, setSelectedCampaignForEditingInForm] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState("campaign-hub");


  const { toast } = useToast();

  const predefinedAgentRoles: AgentRole[] = [
    "Creative Director", "Content Writer", "Brand Persona", 
    "Analytics Strategist", "Visual Content", "SEO Optimization", "Quality Assurance", "Orchestrator"
  ];

  const handleNewCampaignCreatedOrUpdated = (campaign: Campaign) => {
    setRefreshCampaignListTrigger(prev => prev + 1); 
    setSelectedCampaignForProcessing(campaign); 
    setSelectedCampaignForEditingInForm(null); // Clear editing form
    setContentHistory(campaign.contentHistory || []);
    // Set multiFormatContent from the latest version in history if available
    const latestVersion = campaign.contentHistory && campaign.contentHistory.length > 0 
        ? campaign.contentHistory[campaign.contentHistory.length -1] 
        : null;
    setMultiFormatContent(latestVersion ? latestVersion.multiFormatContentSnapshot : null);
    setCurrentCampaignOverallStatus(campaign.status);
    // If campaign is new and user clicked "Save Draft", don't auto-navigate.
    // If they clicked "Save & Generate", handleGenerateContentForCampaign will navigate.
    // If updating, stay on generator tab or current tab.
  };

  const handleGenerateContentForCampaign = async (
    campaign: Campaign,
    brandVoiceOverride?: string,
  ) => {
    if(!campaign || !campaign.id) {
        toast({title: "Error", description: "No campaign selected to generate content.", variant: "destructive"});
        return;
    }

    setIsGeneratingCampaign(true); // Overall campaign processing flag
    setIsDebating(true); // Specific debate phase flag
    await updateCampaignStatusAndRefresh(campaign.id, 'debating');
    setDebateMessages([]);
    setMultiFormatContent(null);
    // setContentHistory([]); // Retain existing history, new version will be added
    setSelectedCampaignForProcessing(campaign); 
    
    const displayBrief = campaign.brief.substring(0, 50);
    const displayAudience = campaign.targetAudience ? `, for ${campaign.targetAudience.substring(0,30)}` : '';
    const displayTone = campaign.tone ? `, with a ${campaign.tone} tone` : '';
    const campaignTitleForDebate = `Campaign: "${displayBrief}..."${displayAudience}${displayTone}`;
    setCurrentDebateTopic(campaignTitleForDebate);
    setActiveTab('debate');

    toast({ title: "Campaign Processing Started", description: "Agents are now working on your campaign." });

    try {
      let augmentedBrief = campaign.brief;
      if (campaign.targetAudience) augmentedBrief += `\nTarget Audience: ${campaign.targetAudience}`;
      if (campaign.tone) augmentedBrief += `\nDesired Tone: ${campaign.tone}`;
      if (campaign.contentGoals && campaign.contentGoals.length > 0) augmentedBrief += `\nContent Goals: ${campaign.contentGoals.join(', ')}`;

      const debateInput: AgentDebateInput = {
        topic: `Formulate content strategy for a campaign about: ${augmentedBrief}. Focus on key messaging, angles, and potential pitfalls.`,
        initialContent: augmentedBrief,
        agentRoles: ["Creative Director", "Brand Persona", "Analytics Strategist", "Content Writer"], 
      };
      const debateResult = await agentDebateAction(debateInput);

      if ('error' in debateResult) {
        throw new Error(`Debate failed: ${debateResult.error}`);
      }
      
      const simulatedMessages: AgentMessage[] = [];
      simulatedMessages.push({ agentId: 'orchestrator-start', agentName: 'Orchestrator', agentRole: 'Orchestrator', message: `Debate initiated for campaign: "${campaign.brief.substring(0,100)}...". Agents are formulating strategy.`, timestamp: new Date(), type: 'statement'});
      
      if (debateResult.contentSuggestions && debateResult.contentSuggestions.length > 0) {
        simulatedMessages.push({ agentId: 'agent-cd', agentName: 'Creative Director', agentRole: 'Creative Director', message: debateResult.contentSuggestions[0], timestamp: new Date(), type: 'suggestion' });
        if (debateResult.contentSuggestions.length > 1) {
             simulatedMessages.push({ agentId: 'agent-bp', agentName: 'Brand Persona', agentRole: 'Brand Persona', message: debateResult.contentSuggestions[1], timestamp: new Date(), type: 'critique' });
        }
      } else {
         simulatedMessages.push({ agentId: 'agent-cw', agentName: 'Content Writer', agentRole: 'Content Writer', message: "Analyzing the brief for key angles...", timestamp: new Date(), type: 'statement' });
      }
      simulatedMessages.push({ agentId: 'orchestrator-summary', agentName: 'Orchestrator', agentRole: 'Orchestrator', message: `Debate Summary: ${debateResult.debateSummary}`, timestamp: new Date(), type: 'statement'});
      
      setDebateMessages(simulatedMessages);
      setIsDebating(false); // Debate phase specifically is done
      await updateCampaignStatusAndRefresh(campaign.id, 'generating');
      toast({ title: "Debate Phase Complete", description: "Agents have concluded. Generating content." });
      setActiveTab('preview');


      const contentInput: GenerateContentInput = {
        inputContent: `${augmentedBrief}\n\nKey insights from debate: ${debateResult.debateSummary}\n${debateResult.contentSuggestions.join('\n')}`,
        brandVoice: brandVoiceOverride, 
      };
      const contentResult = await generateContentAction(contentInput);

      if ('error' in contentResult) {
        throw new Error(`Content generation failed: ${contentResult.error}`);
      }

      setMultiFormatContent(contentResult);
      const newVersion: ContentVersion = {
        id: `v${(selectedCampaignForProcessing?.contentHistory?.length || 0) + 1}`, 
        timestamp: new Date(),
        actorName: "AI Team (Generation)",
        changeSummary: "Initial content generated based on brief and debate.",
        multiFormatContentSnapshot: contentResult,
      };
      // Fetch current campaign to get latest history before updating
      const currentCampaignState = selectedCampaignForProcessing;
      const updatedHistory = [...(currentCampaignState?.contentHistory || []), newVersion];
      
      setContentHistory(updatedHistory);
      await updateCampaignStatusAndRefresh(campaign.id, 'review', updatedHistory);
      toast({ title: "Content Generation Complete", description: "Multi-format content is ready for preview." });

    } catch (error) {
      console.error("Campaign Generation Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Campaign Generation Failed", description: errorMessage, variant: "destructive" });
      await updateCampaignStatusAndRefresh(campaign.id, 'draft'); 
      setIsDebating(false);
    } finally {
      setIsGeneratingCampaign(false); // Overall campaign processing is done
    }
  };

  const updateCampaignStatusAndRefresh = async (campaignId: string, status: CampaignStatus, newContentHistory?: ContentVersion[]) => {
    const result = await updateCampaignStatusAPI(campaignId, status, newContentHistory);
    if ('error'in result) {
      toast({ title: "Status Update Failed", description: result.error, variant: "destructive"});
    } else {
      setCurrentCampaignOverallStatus(status);
      setRefreshCampaignListTrigger(prev => prev + 1); 
      if (selectedCampaignForProcessing && selectedCampaignForProcessing.id === campaignId) {
        setSelectedCampaignForProcessing(prev => {
            if (!prev) return null;
            const updatedCampaign = {...prev, status: status };
            if (newContentHistory) {
                updatedCampaign.contentHistory = newContentHistory;
            }
            return updatedCampaign;
        });
      }
    }
  };

  const handleViewVersion = (version: ContentVersion) => {
    setMultiFormatContent(version.multiFormatContentSnapshot);
    setActiveTab('preview');
    toast({title: `Viewing Version: ${version.id}`, description: `Displaying content snapshot from ${new Date(version.timestamp).toLocaleString()}`});
  };


  const handleCampaignSelectionFromList = async (campaignId: string | null, action: 'view' | 'edit') => {
    setSelectedCampaignForEditingInForm(null); 

    if (!campaignId) {
      setSelectedCampaignForProcessing(null);
      // Reset relevant states when no campaign is selected
      // setDebateMessages([]); // Already reset by selectedCampaignForProcessing useEffect
      // setMultiFormatContent(null);
      // setContentHistory([]);
      // setCurrentDebateTopic(undefined);
      // setCurrentCampaignOverallStatus('draft');
      setActiveTab('campaign-hub'); 
      return;
    }

    try {
      // Fetch all campaigns to find the selected one. 
      // TODO: Optimize by fetching only the specific campaign by ID if API supports it.
      const campaignsResponse = await fetch(`/api/campaigns`);
      if (!campaignsResponse.ok) throw new Error("Failed to fetch campaigns to find the selected one.");
      const campaigns: Campaign[] = await campaignsResponse.json();
      const campaignToSelect = campaigns.find(c => c.id === campaignId);


      if (!campaignToSelect) {
        toast({ title: "Error", description: "Campaign not found.", variant: "destructive" });
        return;
      }
      
      setSelectedCampaignForProcessing(campaignToSelect);
      // Other states (currentCampaignOverallStatus, contentHistory, multiFormatContent, currentDebateTopic)
      // will be updated by the useEffect hook watching selectedCampaignForProcessing.
      
      if (action === 'edit') {
        setSelectedCampaignForEditingInForm(campaignToSelect); 
        setActiveTab('generator'); 
        toast({ title: "Editing Campaign", description: `Loaded "${campaignToSelect.brief.substring(0,30)}..." for editing.`});
      } else if (action === 'view') {
        const latestVersion = campaignToSelect.contentHistory && campaignToSelect.contentHistory.length > 0 
            ? campaignToSelect.contentHistory[campaignToSelect.contentHistory.length - 1] 
            : null;

        if (latestVersion) {
             toast({ title: "Viewing Campaign", description: `Displaying latest content for "${campaignToSelect.brief.substring(0,30)}...".`});
             setActiveTab('preview');
        } else if (campaignToSelect.status === 'draft' || campaignToSelect.status === 'debating' || campaignToSelect.status === 'generating' ) {
            toast({ title: "Campaign Status: " + campaignToSelect.status, description: `Generate content for "${campaignToSelect.brief.substring(0,30)}..." or edit the brief.`});
            setSelectedCampaignForEditingInForm(campaignToSelect); 
            setActiveTab('generator');
        } else { // Review, Published, Archived with no content history (edge case)
            toast({ title: "Viewing Campaign", description: `No content versions found for "${campaignToSelect.brief.substring(0,30)}...". Consider re-generating or editing.`});
            setActiveTab('preview'); // Show empty preview
        }
      }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load campaign details.";
        toast({ title: "Error Loading Campaign", description: errorMessage, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (selectedCampaignForProcessing) {
        setCurrentCampaignOverallStatus(selectedCampaignForProcessing.status);
        const displayBrief = selectedCampaignForProcessing.brief.substring(0, 70) + (selectedCampaignForProcessing.brief.length > 70 ? "..." : "");
        setCurrentDebateTopic(`Campaign: "${displayBrief}"`);
        setContentHistory(selectedCampaignForProcessing.contentHistory || []);
        const latestVersion = selectedCampaignForProcessing.contentHistory && selectedCampaignForProcessing.contentHistory.length > 0 
            ? selectedCampaignForProcessing.contentHistory[selectedCampaignForProcessing.contentHistory.length - 1] 
            : null;
        setMultiFormatContent(latestVersion ? latestVersion.multiFormatContentSnapshot : null);
        setDebateMessages([]); // Reset debate messages when campaign changes, they are specific to a generation run

    } else {
        setCurrentCampaignOverallStatus('draft');
        setCurrentDebateTopic(undefined);
        setDebateMessages([]);
        setMultiFormatContent(null);
        setContentHistory([]);
    }
  }, [selectedCampaignForProcessing]);


  const getStatusBadgeIcon = (status: CampaignStatus) => {
    switch(status) {
      case 'draft': return <Lightbulb className="h-4 w-4 text-gray-500"/>;
      case 'debating': return <Users className="h-4 w-4 text-blue-500 animate-pulse"/>;
      case 'generating': return <Bot className="h-4 w-4 text-purple-500 animate-spin"/>;
      case 'review': return <FileText className="h-4 w-4 text-green-500"/>;
      case 'published': return <BadgeCheck className="h-4 w-4 text-teal-500"/>;
      case 'archived': return <Library className="h-4 w-4 text-gray-400"/>;
      default: return <Lightbulb className="h-4 w-4 text-gray-500"/>;
    }
  };
  
  const campaignStatusTextMap: Record<CampaignStatus, string> = {
    draft: "Draft",
    debating: "Agents Debating...",
    generating: "Generating Content...",
    review: "Ready for Review",
    published: "Published",
    archived: "Archived"
  };

  const hasContentForPreview = multiFormatContent && Object.values(multiFormatContent).some(v => v && v.length > 0);
  const hasContentForPerformance = multiFormatContent && Object.values(multiFormatContent).some(v => v && v.length > 0);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">ContentCraft AI Dashboard</h1>
            <p className="text-lg text-muted-foreground">
            Orchestrate your AI creative team for powerful content campaigns.
            </p>
        </div>
        <div className="flex items-center gap-2 p-2 border rounded-md bg-card min-w-[200px] justify-center shadow">
            {getStatusBadgeIcon(currentCampaignOverallStatus)}
            <span className="text-sm font-medium">{campaignStatusTextMap[currentCampaignOverallStatus]}</span>
        </div>
      </div>
      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1 h-auto flex-wrap">
          <TabsTrigger value="campaign-hub"><ListChecks className="mr-1 sm:mr-2 h-4 w-4" />Campaigns</TabsTrigger>
          <TabsTrigger value="generator"><Lightbulb className="mr-1 sm:mr-2 h-4 w-4" />{selectedCampaignForEditingInForm ? "Edit" : "New"} Campaign</TabsTrigger>
          <TabsTrigger value="debate" disabled={!selectedCampaignForProcessing && debateMessages.length === 0}><Users className="mr-1 sm:mr-2 h-4 w-4" />Debate</TabsTrigger>
          <TabsTrigger value="preview" disabled={!selectedCampaignForProcessing || !hasContentForPreview}><FileText className="mr-1 sm:mr-2 h-4 w-4" />Preview</TabsTrigger>
          <TabsTrigger value="brand"><Sparkles className="mr-1 sm:mr-2 h-4 w-4" />Brand DNA</TabsTrigger>
          <TabsTrigger value="evolution" disabled={!selectedCampaignForProcessing || contentHistory.length === 0}><Activity className="mr-1 sm:mr-2 h-4 w-4" />Evolution</TabsTrigger>
          <TabsTrigger value="performance" disabled={!selectedCampaignForProcessing || !hasContentForPerformance}><TrendingUp className="mr-1 sm:mr-2 h-4 w-4" />Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="campaign-hub" className="mt-6">
           <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><ListChecks className="h-6 w-6 text-primary"/>Your Campaigns</CardTitle>
                    <CardDescription>View, edit, or manage your existing content campaigns. Select a campaign to start or create a new one.</CardDescription>
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

        <TabsContent value="debate" className="mt-6">
             <AgentDebatePanel 
                debateMessages={debateMessages} 
                isDebating={isDebating && currentCampaignOverallStatus === 'debating'} 
                debateTopic={currentDebateTopic} 
             />
        </TabsContent>
        
        <TabsContent value="preview" className="mt-6">
            <MultiFormatPreview 
                content={multiFormatContent} 
                isLoading={isGeneratingCampaign && (currentCampaignOverallStatus === 'generating' || currentCampaignOverallStatus === 'debating') && !multiFormatContent} 
            />
        </TabsContent>

        <TabsContent value="brand" className="mt-6">
          <BrandDNAAnalyzer />
        </TabsContent>

        <TabsContent value="evolution" className="mt-6">
            <ContentEvolutionTimeline 
                versions={contentHistory}
                onViewVersion={handleViewVersion}
            />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
            <PerformancePredictor 
                campaignId={selectedCampaignForProcessing?.id} 
                contentToAnalyze={multiFormatContent} 
            />
        </TabsContent>
        
      </Tabs>
    </div>
  );
}

