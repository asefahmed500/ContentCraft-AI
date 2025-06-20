
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

  const predefinedAgentRoles: AgentRole[] = [
    "Creative Director", "Content Writer", "Brand Persona", 
    "Analytics Strategist", "Visual Content", "SEO Optimization", "Quality Assurance", "Orchestrator"
  ];

  const handleNewCampaignCreatedOrUpdated = (campaign: Campaign) => {
    setRefreshCampaignListTrigger(prev => prev + 1); 
    setSelectedCampaignForProcessing(campaign); 
    setSelectedCampaignForEditingInForm(null); 
  };

  const handleGenerateContentForCampaign = async (
    campaign: Campaign,
    brandVoiceOverride?: string,
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
        // Pick a subset of roles for the AI to "embody" in its summary, or let it choose
        agentRoles: ["Creative Director", "Brand Persona", "Analytics Strategist", "Content Writer"], 
      };
      const debateResult = await agentDebateAction(debateInput);

      if ('error' in debateResult) {
        throw new Error(`Debate failed: ${debateResult.error}`);
      }
      
      const simulatedMessages: AgentMessage[] = [];
      simulatedMessages.push({ agentId: 'orchestrator-start', agentName: 'Orchestrator', agentRole: 'Orchestrator', message: `Debate initiated for campaign: "${campaign.brief.substring(0,100)}...". Agents are formulating strategy.`, timestamp: new Date(), type: 'statement'});
      
      // Simulate messages from debateResult
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

    } catch (error) {
      console.error("Campaign Generation Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Campaign Generation Failed", description: errorMessage, variant: "destructive" });
      await updateCampaignStatusAndRefresh(campaign.id, 'draft'); // Reset to draft on failure
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
      setRefreshCampaignListTrigger(prev => prev + 1); 
      // Update the selected campaign for processing if it's the one being changed
      if (selectedCampaignForProcessing && selectedCampaignForProcessing.id === campaignId) {
        setSelectedCampaignForProcessing(prev => prev ? {...prev, status: status} : null);
      }
    }
  };


  const handleCampaignSelectionFromList = async (campaignId: string | null, action: 'view' | 'edit') => {
    setSelectedCampaignForEditingInForm(null); 

    if (!campaignId) {
      setSelectedCampaignForProcessing(null);
      setDebateMessages([]);
      setMultiFormatContent(null);
      setCurrentDebateTopic(undefined);
      setCurrentCampaignOverallStatus('draft');
      setActiveTab('campaign-hub'); 
      return;
    }

    try {
      // Fetch details for the specific campaign to ensure data freshness
      // This assumes an API endpoint like /api/campaigns?id={campaignId} exists or GET /api/campaigns returns an array
      const campaignsResponse = await fetch(`/api/campaigns`);
      if (!campaignsResponse.ok) throw new Error("Failed to fetch campaigns to find the selected one.");
      const campaigns: Campaign[] = await campaignsResponse.json();
      const campaignToSelect = campaigns.find(c => c.id === campaignId);


      if (!campaignToSelect) {
        toast({ title: "Error", description: "Campaign not found.", variant: "destructive" });
        return;
      }
      
      setSelectedCampaignForProcessing(campaignToSelect);
      setCurrentCampaignOverallStatus(campaignToSelect.status);
      
      // Reset specific states for the newly selected campaign
      setDebateMessages([]); 
      setMultiFormatContent(null); // In a real app, you'd fetch this if persisted
      const displayBrief = campaignToSelect.brief.substring(0, 50);
      setCurrentDebateTopic(`Campaign: "${displayBrief}..."`);


      if (action === 'edit') {
        setSelectedCampaignForEditingInForm(campaignToSelect); 
        setActiveTab('generator'); 
        toast({ title: "Editing Campaign", description: `Loaded "${campaignToSelect.brief.substring(0,30)}..." for editing.`});
      } else if (action === 'view') {
        // For "View", attempt to show existing content or guide to generate
        // This part needs persisted content to be truly effective. For now, it relies on local state after generation.
        if ((campaignToSelect.status === 'review' || campaignToSelect.status === 'published') /* && campaignToSelect.generatedContent */) {
             // setMultiFormatContent(campaignToSelect.generatedContent || null); // Requires generatedContent on Campaign type
             toast({ title: "Viewing Campaign", description: `Displaying details for "${campaignToSelect.brief.substring(0,30)}...". Generate content if not already done.`});
             setActiveTab('preview'); // Or 'performance' or 'evolution'
        } else {
            toast({ title: "Campaign Status: " + campaignToSelect.status, description: `Generate content for "${campaignToSelect.brief.substring(0,30)}..." or edit the brief.`});
            setSelectedCampaignForEditingInForm(campaignToSelect); 
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
        setCurrentDebateTopic(selectedCampaignForProcessing.brief.substring(0,70) + "...");
    } else {
        setCurrentCampaignOverallStatus('draft');
        setCurrentDebateTopic(undefined);
        setDebateMessages([]);
        setMultiFormatContent(null);
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

