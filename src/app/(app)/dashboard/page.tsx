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
import type { AgentMessage } from '@/types/agent';
import type { MultiFormatContent, CampaignStatus, Campaign } from '@/types/content';
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

async function updateCampaignStatusAPI(campaignId: string, status: CampaignStatus): Promise<Campaign | { error: string }> {
  try {
    const response = await fetch(`/api/campaigns?id=${campaignId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update campaign status');
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating campaign status:", error);
    return { error: error instanceof Error ? error.message : "An unknown error occurred." };
  }
}


export default function DashboardPage() {
  const [debateMessages, setDebateMessages] = useState<AgentMessage[]>([]);
  const [multiFormatContent, setMultiFormatContent] = useState<MultiFormatContent | null>(null);
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [isDebating, setIsDebating] = useState(false);
  const [currentDebateTopic, setCurrentDebateTopic] = useState<string | undefined>(undefined);
  const [currentCampaignOverallStatus, setCurrentCampaignOverallStatus] = useState<CampaignStatus>('draft');
  const [refreshCampaignListTrigger, setRefreshCampaignListTrigger] = useState(0);
  const [selectedCampaignForProcessing, setSelectedCampaignForProcessing] = useState<Campaign | null>(null); 
  const [selectedCampaignForEditingInForm, setSelectedCampaignForEditingInForm] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState("campaign-hub");


  const { toast } = useToast();

  const predefinedAgentRoles = [
    "Creative Director", "Content Writer", "Brand Persona", 
    "Analytics Strategist", "Visual Content", "SEO Optimization", "Quality Assurance"
  ];

  const handleNewCampaignCreatedOrUpdated = (campaign: Campaign) => {
    setRefreshCampaignListTrigger(prev => prev + 1); 
    setSelectedCampaignForProcessing(campaign); // Set this as the campaign in focus if it was just created/updated
    setSelectedCampaignForEditingInForm(null); // Clear form editing state after save
    // toast({ title: "Campaign Ready", description: `Campaign "${campaign.brief.substring(0,30)}..." is ready.` });
  };

  const handleGenerateContentForCampaign = async (
    campaign: Campaign,
    brandVoiceOverride?: string, // Renamed from brandVoiceFromDNA for clarity
  ) => {
    if(!campaign || !campaign.id) {
        toast({title: "Error", description: "No campaign selected to generate content.", variant: "destructive"});
        return;
    }

    setIsGeneratingCampaign(true);
    setIsDebating(true);
    await updateCampaignStatusAndRefresh(campaign.id, 'debating');
    setDebateMessages([]);
    setMultiFormatContent(null);
    setSelectedCampaignForProcessing(campaign); 
    
    const displayBrief = campaign.brief.substring(0, 50);
    const displayAudience = campaign.targetAudience ? `, for ${campaign.targetAudience.substring(0,30)}` : '';
    const displayTone = campaign.tone ? `, with ${campaign.tone} tone` : '';
    const campaignTitle = `Working on: "${displayBrief}..."${displayAudience}${displayTone}`;
    setCurrentDebateTopic(campaignTitle);
    setActiveTab('debate');

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
        { agentId: 'orchestrator', agentName: 'Orchestrator', agentRole: 'Orchestrator', message: `Debate initiated for: ${augmentedBrief.substring(0,100)}...`, timestamp: new Date(), type: 'statement'},
        { agentId: 'agent-cd', agentName: 'Creative Director', agentRole: 'Creative Director', message: debateResult.contentSuggestions[0] || "Let's ensure bold, authentic messaging.", timestamp: new Date(), type: 'statement' },
        { agentId: 'agent-bp', agentName: 'Brand Persona', agentRole: 'Brand Persona', message: debateResult.contentSuggestions[1] || "Focus on transparency for the target audience.", timestamp: new Date(), type: 'critique' },
        { agentId: 'orchestrator', agentName: 'Orchestrator', agentRole: 'Orchestrator', message: `Debate Summary: ${debateResult.debateSummary}`, timestamp: new Date(), type: 'statement'},
      ];
      setDebateMessages(newDebateMessages);
      setIsDebating(false);
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
      await updateCampaignStatusAndRefresh(campaign.id, 'review');
      toast({ title: "Content Generation Complete", description: "Multi-format content is ready for preview." });
      // TODO: Persist multiFormatContent to the campaign document in DB
      // For now, it's stored in local state `multiFormatContent` and associated with `selectedCampaignForProcessing`


    } catch (error) {
      console.error("Campaign Generation Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Campaign Generation Failed", description: errorMessage, variant: "destructive" });
      await updateCampaignStatusAndRefresh(campaign.id, 'draft');
      setIsDebating(false);
    } finally {
      setIsGeneratingCampaign(false);
    }
  };

  const updateCampaignStatusAndRefresh = async (campaignId: string, status: CampaignStatus) => {
    const result = await updateCampaignStatusAPI(campaignId, status);
    if ('error' in result) {
      toast({ title: "Status Update Failed", description: result.error, variant: "destructive"});
    } else {
      setCurrentCampaignOverallStatus(status);
      setRefreshCampaignListTrigger(prev => prev + 1); // Refresh list to show new status
    }
  };


  const handleCampaignSelectionFromList = async (campaignId: string | null, action: 'view' | 'edit') => {
    setSelectedCampaignForEditingInForm(null); // Clear form editing state first

    if (!campaignId) {
      setSelectedCampaignForProcessing(null);
      setDebateMessages([]);
      setMultiFormatContent(null);
      setCurrentDebateTopic(undefined);
      setCurrentCampaignOverallStatus('draft');
      setActiveTab('campaign-hub'); 
      return;
    }

    // Fetch the full campaign details from API to ensure we have the latest data
    try {
      const response = await fetch(`/api/campaigns`); // Assuming GET /api/campaigns gets all, then filter
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      const campaigns: Campaign[] = await response.json();
      const campaignToSelect = campaigns.find(c => c.id === campaignId);

      if (!campaignToSelect) {
        toast({ title: "Error", description: "Campaign not found.", variant: "destructive" });
        return;
      }
      
      setSelectedCampaignForProcessing(campaignToSelect);
      setCurrentCampaignOverallStatus(campaignToSelect.status);
      // TODO: Fetch existing debate messages and multi-format content for this campaign if they exist in DB.
      // For now, they will be cleared and re-generated if "Edit & Generate" is chosen, or shown if "View".
      setDebateMessages([]); // Placeholder: load from campaignToSelect.agentDebates if stored
      setMultiFormatContent(null); // Placeholder: load from campaignToSelect.contentVersions if stored


      if (action === 'edit') {
        setSelectedCampaignForEditingInForm(campaignToSelect); // Pre-fill the generator form
        setActiveTab('generator'); // Switch to generator tab for editing
        toast({ title: "Editing Campaign", description: `Loaded "${campaignToSelect.brief.substring(0,30)}..." for editing.`});
      } else if (action === 'view') {
        // For "View", we'd typically show existing generated content and metrics.
        // If content needs to be generated first, direct user or trigger it.
        if (campaignToSelect.status === 'review' || campaignToSelect.status === 'published') {
             // Assume content exists and set it (requires fetching/storing it on Campaign object)
             // setMultiFormatContent(campaignToSelect.generatedContent || null); // Example
             toast({ title: "Viewing Campaign", description: `Displaying content for "${campaignToSelect.brief.substring(0,30)}...". Metrics and evolution are mock.`});
             setActiveTab('preview');
        } else {
            toast({ title: "Campaign Not Ready for View", description: `Campaign "${campaignToSelect.brief.substring(0,30)}..." is in '${campaignToSelect.status}' status. Generate content first.`});
            setSelectedCampaignForEditingInForm(campaignToSelect); // Allow to start generation
            setActiveTab('generator');
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
        setCurrentDebateTopic(selectedCampaignForProcessing.brief.substring(0,50) + "...");
    } else {
        setCurrentCampaignOverallStatus('draft');
        setCurrentDebateTopic(undefined);
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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1">
          <TabsTrigger value="campaign-hub"><ListChecks className="mr-1 sm:mr-2 h-4 w-4" />Campaigns</TabsTrigger>
          <TabsTrigger value="generator"><Lightbulb className="mr-1 sm:mr-2 h-4 w-4" />{selectedCampaignForEditingInForm ? "Edit" : "New"} Campaign</TabsTrigger>
          <TabsTrigger value="debate" disabled={!selectedCampaignForProcessing && debateMessages.length === 0}><Users className="mr-1 sm:mr-2 h-4 w-4" />Debate</TabsTrigger>
          <TabsTrigger value="preview" disabled={!selectedCampaignForProcessing && !multiFormatContent}><FileText className="mr-1 sm:mr-2 h-4 w-4" />Preview</TabsTrigger>
          <TabsTrigger value="brand"><Sparkles className="mr-1 sm:mr-2 h-4 w-4" />Brand DNA</TabsTrigger>
          <TabsTrigger value="evolution" disabled={!selectedCampaignForProcessing}><Activity className="mr-1 sm:mr-2 h-4 w-4" />Evolution</TabsTrigger>
          <TabsTrigger value="performance" disabled={!selectedCampaignForProcessing}><TrendingUp className="mr-1 sm:mr-2 h-4 w-4" />Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="campaign-hub" className="mt-6">
           <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><ListChecks className="h-6 w-6 text-primary"/>Your Campaigns</CardTitle>
                    <CardDescription>View, edit, or manage your existing content campaigns. Select a campaign to start.</CardDescription>
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
                isDebating={isDebating} 
                debateTopic={currentDebateTopic || selectedCampaignForProcessing?.brief.substring(0,70)} 
             />
        </TabsContent>
        
        <TabsContent value="preview" className="mt-6">
            <MultiFormatPreview 
                content={multiFormatContent} 
                isLoading={isGeneratingCampaign && currentCampaignOverallStatus === 'generating' && !multiFormatContent} 
            />
        </TabsContent>

        <TabsContent value="brand" className="mt-6">
          <BrandDNAAnalyzer />
        </TabsContent>

        <TabsContent value="evolution" className="mt-6">
            <ContentEvolutionTimeline 
                campaignId={selectedCampaignForProcessing?.id || "current"} 
                // Mocked versions based on current multiFormatContent. Real app would fetch from DB.
                contentVersions={selectedCampaignForProcessing && multiFormatContent ? [{id: 'v1', text: JSON.stringify(multiFormatContent, null, 2), agentName: 'AI Team', timestamp: new Date(), changeSummary: 'Initial generation based on brief and debate.'}] : []} 
            />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
            <PerformancePredictor 
                campaignId={selectedCampaignForProcessing?.id || "current"} 
                contentToAnalyze={selectedCampaignForProcessing ? multiFormatContent : null} 
            />
        </TabsContent>
        
      </Tabs>
    </div>
  );
}
