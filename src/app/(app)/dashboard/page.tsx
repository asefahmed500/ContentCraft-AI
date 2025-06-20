"use client";

import { useState, useCallback } from 'react';
import { BrandDNAAnalyzer } from './components/BrandDNAAnalyzer';
import { AgentDebatePanel } from './components/AgentDebatePanel';
import { MultiFormatPreview } from './components/MultiFormatPreview';
import { CampaignGenerator } from './components/CampaignGenerator';
import { ContentEvolutionTimeline } from './components/ContentEvolutionTimeline';
import { PerformancePredictor } from './components/PerformancePredictor';
import { CampaignList } from './components/CampaignList'; // New
import type { AgentDebateInput, AgentDebateOutput } from '@/ai/flows/agent-debate';
import { agentDebate } from '@/ai/flows/agent-debate';
import type { GenerateContentInput, GenerateContentOutput } from '@/ai/flows/content-generation';
import { generateContent } from '@/ai/flows/content-generation';
import type { AgentMessage } from '@/types/agent';
import type { MultiFormatContent, CampaignStatus, Campaign } from '@/types/content';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Users, Bot, Library, FileText, Activity, TrendingUp, BadgeCheck, ListChecks, Lightbulb } from 'lucide-react';

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

export default function DashboardPage() {
  const [debateMessages, setDebateMessages] = useState<AgentMessage[]>([]);
  const [multiFormatContent, setMultiFormatContent] = useState<MultiFormatContent | null>(null);
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [isDebating, setIsDebating] = useState(false);
  const [currentDebateTopic, setCurrentDebateTopic] = useState<string | undefined>(undefined);
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>('draft');
  const [refreshCampaignListTrigger, setRefreshCampaignListTrigger] = useState(0);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null); // For viewing/editing
  const [activeTab, setActiveTab] = useState("campaign-hub");


  const { toast } = useToast();

  const predefinedAgentRoles = [
    "Creative Director", "Content Writer", "Brand Persona", 
    "Analytics Strategist", "Visual Content", "SEO Optimization", "Quality Assurance"
  ];

  const handleNewCampaignCreated = (newCampaign: Campaign) => {
    // This function is called by CampaignGenerator after successfully creating a campaign via API
    setRefreshCampaignListTrigger(prev => prev + 1); // Trigger CampaignList refresh
    toast({ title: "Campaign Created", description: `Campaign "${newCampaign.brief.substring(0,30)}..." started.` });
    // Optionally, select the new campaign and switch to its "edit" or "debate" view
    // For now, just refresh the list.
  };

  const handleGenerateContentForCampaign = async (
    campaign: Campaign,
    brandVoiceFromDNA?: string,
  ) => {
    setIsGeneratingCampaign(true);
    setIsDebating(true);
    setCampaignStatus('debating'); // Set specific campaign status, if campaign object has it.
    setDebateMessages([]);
    setMultiFormatContent(null);
    setSelectedCampaign(campaign); // Keep track of the campaign being processed
    
    const displayBrief = campaign.brief.substring(0, 50);
    const displayAudience = campaign.targetAudience ? `, for ${campaign.targetAudience.substring(0,30)}` : '';
    const displayTone = campaign.tone ? `, with ${campaign.tone} tone` : '';
    const campaignTitle = `Working on: "${displayBrief}..."${displayAudience}${displayTone}`;
    setCurrentDebateTopic(campaignTitle);

    toast({ title: "Campaign Processing Started", description: "Agents are now working on your campaign." });

    try {
      let augmentedBrief = campaign.brief;
      if (campaign.targetAudience) augmentedBrief += `\nTarget Audience: ${campaign.targetAudience}`;
      if (campaign.tone) augmentedBrief += `\nDesired Tone: ${campaign.tone}`;
      if (campaign.contentGoals && campaign.contentGoals.length > 0) augmentedBrief += `\nContent Goals: ${campaign.contentGoals.join(', ')}`;

      const debateInput: AgentDebateInput = {
        topic: `Campaign strategy for: ${augmentedBrief}`,
        initialContent: augmentedBrief,
        agentRoles: predefinedAgentRoles,
      };
      const debateResult = await agentDebateAction(debateInput);

      if ('error' in debateResult) {
        throw new Error(`Debate failed: ${debateResult.error}`);
      }
      
      const newDebateMessages: AgentMessage[] = [
        { agentId: 'orchestrator', agentName: 'Orchestrator', agentRole: 'Orchestrator', message: `Debate initiated for: ${augmentedBrief}`, timestamp: new Date(), type: 'statement'},
        { agentId: 'agent-cd', agentName: 'Creative Director', agentRole: 'Creative Director', message: debateResult.contentSuggestions[0] || "Let's ensure bold, authentic messaging.", timestamp: new Date(), type: 'statement' },
        { agentId: 'agent-bp', agentName: 'Brand Persona', agentRole: 'Brand Persona', message: debateResult.contentSuggestions[1] || "Focus on transparency for the target audience.", timestamp: new Date(), type: 'critique' },
        { agentId: 'orchestrator', agentName: 'Orchestrator', agentRole: 'Orchestrator', message: `Debate Summary: ${debateResult.debateSummary}`, timestamp: new Date(), type: 'statement'},
      ];
      setDebateMessages(newDebateMessages);
      setIsDebating(false);
      setCampaignStatus('generating');
      toast({ title: "Debate Phase Complete", description: "Agents have concluded their discussion. Now generating content." });

      const contentInput: GenerateContentInput = {
        inputContent: `${augmentedBrief}\n\nKey insights from debate: ${debateResult.debateSummary}\n${debateResult.contentSuggestions.join('\n')}`,
        brandVoice: brandVoiceFromDNA, // Use voice from DNA if available, or from campaign override
      };
      const contentResult = await generateContentAction(contentInput);

      if ('error' in contentResult) {
        throw new Error(`Content generation failed: ${contentResult.error}`);
      }

      setMultiFormatContent(contentResult);
      setCampaignStatus('review'); 
      // Here you would update the specific campaign's status in the DB to 'review' and store its content
      // For now, this state is local to the dashboard page for the currently "active" generation flow.
      toast({ title: "Content Generation Complete", description: "Multi-format content is ready for preview." });
      // Potentially update the selectedCampaign in DB with the new multiFormatContent and status.
      // And refresh the CampaignList.
      setRefreshCampaignListTrigger(prev => prev + 1);


    } catch (error) {
      console.error("Campaign Generation Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during campaign generation.";
      toast({ title: "Campaign Generation Failed", description: errorMessage, variant: "destructive" });
      setCampaignStatus('draft'); 
      setIsDebating(false);
    } finally {
      setIsGeneratingCampaign(false);
    }
  };

  const handleCampaignSelection = async (campaignId: string | null, action: 'view' | 'edit') => {
    if (!campaignId) {
      setSelectedCampaign(null);
      // Reset relevant states when deselecting or for a new campaign.
      setDebateMessages([]);
      setMultiFormatContent(null);
      setCurrentDebateTopic(undefined);
      setCampaignStatus('draft');
      setActiveTab('campaign-hub'); // Or wherever new campaign creation happens
      return;
    }

    // Fetch the specific campaign details if needed, or use already fetched list.
    // For this example, let's assume we need to "activate" it for edit/view.
    // We would typically fetch the campaign by ID here to get its full data if not already available.
    // const campaignToSelect = campaigns.find(c => c.id === campaignId); // Assuming 'campaigns' state holds the list
    // setSelectedCampaign(campaignToSelect || null);

    // Simulate fetching campaign data to populate debate, content, etc.
    // In a real app, you'd fetch this campaign's specific data.
    // For now, we'll just set a placeholder or trigger a flow.
    
    // This is a simplified selection. A real app might fetch campaign details.
    const tempCampaign: Campaign = { 
        id: campaignId, 
        brief: `Campaign ${campaignId}`, 
        createdAt: new Date(), 
        updatedAt: new Date(), 
        status: 'draft', 
        userId: '', 
        contentVersions: [] 
    };
    setSelectedCampaign(tempCampaign);


    if (action === 'edit') {
      // This would typically mean starting the debate/generation flow for an existing draft campaign
      toast({ title: "Editing Campaign", description: `Loading campaign ${campaignId} for editing...`});
      // For now, let's just clear content and set a topic.
      // A real "edit" might resume a debate or re-generate content.
      // We can re-purpose `handleGenerateContentForCampaign` if 'editing' means re-running the AI.
      // Or, if it means editing the brief, then the CampaignGenerator needs to be pre-filled.
      
      // For this iteration, "Edit" will put the campaign in focus and allow to re-trigger generation.
      // We can use the existing CampaignGenerator to *update* the brief.
      // The `AgentDebatePanel` and `MultiFormatPreview` should reflect the *selected* campaign.
      // For simplicity, clicking "Edit" might just allow re-running generation.
      setCurrentDebateTopic(`Revisiting Campaign: ${tempCampaign.brief.substring(0,50)}...`);
      setMultiFormatContent(null); // Clear previous preview for this campaign
      setDebateMessages([]); // Clear previous debate messages
      // If we want to start generation:
      // handleGenerateContentForCampaign(tempCampaign);
      setActiveTab('campaign-hub'); // Stay on hub, but generator might be prefilled or section appears for selected campaign

    } else if (action === 'view') {
      // "View" means seeing its current multi-format content and performance
      toast({ title: "Viewing Campaign", description: `Loading content and metrics for campaign ${campaignId}...`});
      // Fetch and display the campaign's generated content and performance data.
      // For now, if multiFormatContent is for *this* campaign, show it.
      // MultiFormatPreview and PerformancePredictor should show data for selectedCampaign.
      // This requires these components to be aware of the selectedCampaign.
      // This is a placeholder - actual content/metrics would be fetched or passed.
      // setMultiFormatContent(selectedCampaign.generatedContent || null); // Assuming campaign object stores this
      setActiveTab('preview'); // A new tab for just viewing generated content
    }
  };


  const getStatusBadge = (status: CampaignStatus) => {
    switch(status) {
      case 'draft': return <Lightbulb className="h-4 w-4 text-gray-500"/>; // Changed icon
      case 'debating': return <Users className="h-4 w-4 text-blue-500 animate-pulse"/>;
      case 'generating': return <Bot className="h-4 w-4 text-purple-500 animate-spin"/>;
      case 'review': return <FileText className="h-4 w-4 text-green-500"/>;
      case 'published': return <BadgeCheck className="h-4 w-4 text-teal-500"/>; // Changed icon
      case 'archived': return <Library className="h-4 w-4 text-gray-400"/>;
      default: return null;
    }
  };
  
  const campaignStatusText = {
    draft: "Draft",
    debating: "Agents Debating...",
    generating: "Generating Content...",
    review: "Ready for Review",
    published: "Published",
    archived: "Archived"
  };


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">ContentCraft AI Dashboard</h1>
            <p className="text-lg text-muted-foreground">
            Orchestrate your AI creative team and generate stunning content campaigns.
            </p>
        </div>
        <div className="flex items-center gap-2 p-2 border rounded-md bg-card min-w-[200px] justify-center">
            {getStatusBadge(campaignStatus)} {/* This status is for the *current generation process*, not overall app status */}
            <span className="text-sm font-medium">{campaignStatusText[campaignStatus]}</span>
        </div>
      </div>
      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="campaign-hub"><ListChecks className="mr-2 h-4 w-4" />Campaign Hub</TabsTrigger>
          <TabsTrigger value="generator"><Lightbulb className="mr-2 h-4 w-4" />New Campaign</TabsTrigger>
          <TabsTrigger value="debate" disabled={!selectedCampaign && debateMessages.length === 0}><Users className="mr-2 h-4 w-4" />Agent Debate</TabsTrigger>
          <TabsTrigger value="preview" disabled={!selectedCampaign && !multiFormatContent}><FileText className="mr-2 h-4 w-4" />Content Preview</TabsTrigger>
          <TabsTrigger value="brand"><Sparkles className="mr-2 h-4 w-4" />Brand DNA</TabsTrigger>
          <TabsTrigger value="evolution" disabled={!selectedCampaign}><Activity className="mr-2 h-4 w-4" />Evolution</TabsTrigger>
          <TabsTrigger value="performance" disabled={!selectedCampaign}><TrendingUp className="mr-2 h-4 w-4" />Performance</TabsTrigger>
          {/* <TabsTrigger value="library" disabled><Library className="mr-2 h-4 w-4" />Content Library</TabsTrigger> */}
        </TabsList>

        <TabsContent value="campaign-hub" className="mt-6">
           <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><ListChecks className="h-6 w-6 text-primary"/>Your Campaigns</CardTitle>
                    <CardDescription>View, edit, or manage your existing content campaigns.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CampaignList 
                        refreshTrigger={refreshCampaignListTrigger} 
                        onCampaignSelect={handleCampaignSelection} 
                    />
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="generator" className="mt-6">
            <CampaignGenerator 
                onCampaignCreated={handleNewCampaignCreated} 
                onGenerateContentForCampaign={handleGenerateContentForCampaign}
                isGenerating={isGeneratingCampaign}
                // selectedCampaignForEdit={selectedCampaign} // TODO: Pass selected campaign for prefilling form
            />
        </TabsContent>

        <TabsContent value="debate" className="mt-6">
             <AgentDebatePanel 
                debateMessages={debateMessages} 
                isDebating={isDebating} 
                debateTopic={currentDebateTopic || selectedCampaign?.brief} 
             />
        </TabsContent>
        
        <TabsContent value="preview" className="mt-6">
            <MultiFormatPreview 
                content={multiFormatContent} 
                isLoading={isGeneratingCampaign && campaignStatus === 'generating' && !multiFormatContent} 
            />
        </TabsContent>


        <TabsContent value="brand" className="mt-6">
          <BrandDNAAnalyzer />
        </TabsContent>

        <TabsContent value="evolution" className="mt-6">
            <ContentEvolutionTimeline 
                campaignId={selectedCampaign?.id || "current"} 
                contentVersions={selectedCampaign && multiFormatContent ? [{id: 'v1', text: JSON.stringify(multiFormatContent, null, 2), agentName: 'AI Team', timestamp: new Date(), changeSummary: 'Initial generation based on brief and debate.'}] : []} 
            />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
            <PerformancePredictor 
                campaignId={selectedCampaign?.id || "current"} 
                contentToAnalyze={selectedCampaign ? multiFormatContent : null} 
            />
        </TabsContent>
        
        {/* <TabsContent value="library" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Library className="h-6 w-6 text-primary"/>Content Library</CardTitle>
                    <CardDescription>Manage and review all your generated content campaigns. (Feature coming soon)</CardDescription>
                </CardHeader>
                <CardContent className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                    <FileText size={48} className="mb-4"/>
                    <p>This section will display a list of all your past and current campaigns.</p>
                </CardContent>
            </Card>
        </TabsContent> */}
      </Tabs>
    </div>
  );
}
