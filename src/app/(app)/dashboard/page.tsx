
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
import type { MultiFormatContent, CampaignStatus, Campaign, ContentVersion, AgentInteraction } from '@/types/content';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Users, Bot, Library, FileText, Activity, TrendingUp, BadgeCheck, ListChecks, Lightbulb, Edit, MessageSquareWarning, ShieldCheck, SearchCheck, Brain } from 'lucide-react';

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
  const [debateMessages, setDebateMessages] = useState<AgentMessage[]>([]);
  const [multiFormatContent, setMultiFormatContent] = useState<MultiFormatContent | null>(null);
  const [contentVersions, setContentVersions] = useState<ContentVersion[]>([]); // Stores evolution
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [isDebating, setIsDebating] = useState(false);
  const [currentDebateTopic, setCurrentDebateTopic] = useState<string | undefined>(undefined);
  const [currentCampaignOverallStatus, setCurrentCampaignOverallStatus] = useState<CampaignStatus>('draft');
  const [refreshCampaignListTrigger, setRefreshCampaignListTrigger] = useState(0);
  const [selectedCampaignForProcessing, setSelectedCampaignForProcessing] = useState<Campaign | null>(null); 
  const [selectedCampaignForEditingInForm, setSelectedCampaignForEditingInForm] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState("campaign-hub");


  const { toast } = useToast();

  const agentRolesForDebate: AgentRole[] = ["Creative Director", "Content Writer", "Brand Persona", "Analytics Strategist", "SEO Optimization", "Quality Assurance"];
  const orchestratorAgent: AgentMessage['agentName'] = "Orchestrator";


  const handleNewCampaignCreatedOrUpdated = (campaign: Campaign) => {
    setRefreshCampaignListTrigger(prev => prev + 1); 
    setSelectedCampaignForProcessing(campaign); 
    setSelectedCampaignForEditingInForm(null); // Clear editing form after save/update
    setContentVersions(campaign.contentVersions || []);
    const latestVersion = campaign.contentVersions && campaign.contentVersions.length > 0 
        ? campaign.contentVersions[campaign.contentVersions.length -1] 
        : null;
    setMultiFormatContent(latestVersion ? latestVersion.multiFormatContentSnapshot : null);
    setCurrentCampaignOverallStatus(campaign.status);
  };

  const addAgentInteractionToCampaign = async (campaignId: string, interaction: AgentInteraction) => {
    if (!selectedCampaignForProcessing || selectedCampaignForProcessing.id !== campaignId) return;
    const updatedInteractions = [...(selectedCampaignForProcessing.agentDebates || []), interaction];
    const updateResult = await updateCampaignAPI(campaignId, { agentDebates: updatedInteractions });
    if (!('error' in updateResult)) {
        setSelectedCampaignForProcessing(prev => prev ? {...prev, agentDebates: updatedInteractions} : null);
    }
  };

  const addContentVersionToCampaign = async (campaignId: string, version: ContentVersion) => {
     if (!selectedCampaignForProcessing || selectedCampaignForProcessing.id !== campaignId) return;
     const updatedVersions = [...(selectedCampaignForProcessing.contentVersions || []), version];
     const updateResult = await updateCampaignAPI(campaignId, { contentVersions: updatedVersions, status: 'review' }); // Also update status to review
      if (!('error' in updateResult)) {
        setSelectedCampaignForProcessing(prev => prev ? {...prev, contentVersions: updatedVersions, status: 'review'} : null);
        setContentVersions(updatedVersions); // Local state update
        setCurrentCampaignOverallStatus('review');
      }
      return updateResult;
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
    await updateCampaignAPI(campaign.id, { status: 'debating' });
    setCurrentCampaignOverallStatus('debating');

    setDebateMessages([]);
    setMultiFormatContent(null);
    setSelectedCampaignForProcessing(campaign); 
    
    const displayTitle = campaign.title.substring(0, 50);
    const campaignTitleForDebate = `Debate for: "${displayTitle}..."`;
    setCurrentDebateTopic(campaignTitleForDebate);
    setActiveTab('debate');

    toast({ title: "Campaign Processing Started", description: `Agents are now debating strategy for "${campaign.title}".` });

    try {
      let augmentedBrief = `Campaign Title: ${campaign.title}\nBrief: ${campaign.brief}`;
      if (campaign.targetAudience) augmentedBrief += `\nTarget Audience: ${campaign.targetAudience}`;
      if (campaign.tone) augmentedBrief += `\nDesired Tone: ${campaign.tone}`;
      if (campaign.contentGoals && campaign.contentGoals.length > 0) augmentedBrief += `\nContent Goals: ${campaign.contentGoals.join(', ')}`;

      const debateInput: AgentDebateInput = {
        topic: `Formulate content strategy for a campaign about: ${augmentedBrief}. Consider key messages, angles, potential pitfalls, and content formats.`,
        initialContent: augmentedBrief,
        agentRoles: agentRolesForDebate, 
      };
      const debateResult = await agentDebateAction(debateInput);

      if ('error' in debateResult) {
        throw new Error(`Debate failed: ${debateResult.error}`);
      }
      
      const simulatedMessages: AgentMessage[] = [];
      const orchestratorStartMsg: AgentMessage = { agentId: 'orchestrator-start', agentName: orchestratorAgent, agentRole: 'Orchestrator', message: `Debate initiated for campaign: "${campaign.title}". Agents: ${agentRolesForDebate.join(', ')}. Focus: Strategy & Key Messaging.`, timestamp: new Date(), type: 'statement'};
      simulatedMessages.push(orchestratorStartMsg);
      await addAgentInteractionToCampaign(campaign.id, { agent: orchestratorAgent, message: orchestratorStartMsg.message, timestamp: orchestratorStartMsg.timestamp });


      // Simulate debate snippets
      if (debateResult.contentSuggestions && debateResult.contentSuggestions.length > 0) {
        const creativeDirMsg: AgentMessage = { agentId: 'agent-cd', agentName: 'Creative Director', agentRole: 'Creative Director', message: `Key direction: ${debateResult.contentSuggestions[0]}`, timestamp: new Date(), type: 'suggestion' };
        simulatedMessages.push(creativeDirMsg);
        await addAgentInteractionToCampaign(campaign.id, { agent: 'Creative Director', message: creativeDirMsg.message, timestamp: creativeDirMsg.timestamp });


        if (debateResult.contentSuggestions.length > 1) {
             const brandPersonaMsg: AgentMessage = { agentId: 'agent-bp', agentName: 'Brand Persona', agentRole: 'Brand Persona', message: `Critique: ${debateResult.contentSuggestions[1]}. Ensure it matches Gen Z tone if that's the audience.`, timestamp: new Date(), type: 'critique' };
             simulatedMessages.push(brandPersonaMsg);
             await addAgentInteractionToCampaign(campaign.id, { agent: 'Brand Persona', message: brandPersonaMsg.message, timestamp: brandPersonaMsg.timestamp });
        }
        // Add more simulated messages as needed
        const analyticsMsg: AgentMessage = { agentId: 'agent-as', agentName: 'Analytics Strategist', agentRole: 'Analytics Strategist', message: `Data suggests 'clean beauty' (if relevant) performs 40% better for similar target audiences. Keywords around this could be beneficial.`, timestamp: new Date(), type: 'suggestion' };
        simulatedMessages.push(analyticsMsg);
        await addAgentInteractionToCampaign(campaign.id, { agent: 'Analytics Strategist', message: analyticsMsg.message, timestamp: analyticsMsg.timestamp });
        
        const qaMsg: AgentMessage = { agentId: 'agent-qa', agentName: 'Quality Assurance', agentRole: 'Quality Assurance', message: `If we claim 'sustainable', we must ensure robust verification for it.`, timestamp: new Date(), type: 'critique' };
        simulatedMessages.push(qaMsg);
        await addAgentInteractionToCampaign(campaign.id, { agent: 'Quality Assurance', message: qaMsg.message, timestamp: qaMsg.timestamp });

      } else {
         const contentWriterMsg: AgentMessage = { agentId: 'agent-cw', agentName: 'Content Writer', agentRole: 'Content Writer', message: "Analyzing the brief for initial content angles based on provided details...", timestamp: new Date(), type: 'statement' };
         simulatedMessages.push(contentWriterMsg);
         await addAgentInteractionToCampaign(campaign.id, { agent: 'Content Writer', message: contentWriterMsg.message, timestamp: contentWriterMsg.timestamp });
      }
      const orchestratorSummaryMsg: AgentMessage = { agentId: 'orchestrator-summary', agentName: orchestratorAgent, agentRole: 'Orchestrator', message: `Debate Summary: ${debateResult.debateSummary}\nConsensus reached. Proceeding to content generation.`, timestamp: new Date(), type: 'statement'};
      simulatedMessages.push(orchestratorSummaryMsg);
      await addAgentInteractionToCampaign(campaign.id, { agent: orchestratorAgent, message: orchestratorSummaryMsg.message, timestamp: orchestratorSummaryMsg.timestamp });

      setDebateMessages(simulatedMessages);
      setIsDebating(false); 
      await updateCampaignAPI(campaign.id, { status: 'generating' });
      setCurrentCampaignOverallStatus('generating');
      toast({ title: "Debate Phase Complete", description: "Agents have concluded the strategy session. Now generating multi-format content." });
      setActiveTab('preview');


      const contentInput: GenerateContentInput = {
        inputContent: `${augmentedBrief}\n\nKey insights from debate: ${debateResult.debateSummary}\nKey Suggestions: ${debateResult.contentSuggestions.join('\n')}`,
        brandVoice: brandVoiceOverride, 
      };
      const contentResult = await generateContentAction(contentInput);

      if ('error' in contentResult) {
        throw new Error(`Content generation failed: ${contentResult.error}`);
      }

      setMultiFormatContent(contentResult);
      const newVersion: ContentVersion = {
        id: `v${(selectedCampaignForProcessing?.contentVersions?.length || 0) + 1}`,
        versionNumber: (selectedCampaignForProcessing?.contentVersions?.length || 0) + 1,
        timestamp: new Date(),
        actorName: "AI Team (Final Draft)",
        changeSummary: "Initial multi-format content generated based on brief and agent debate.",
        multiFormatContentSnapshot: contentResult,
      };
      
      const finalUpdateResult = await addContentVersionToCampaign(campaign.id, newVersion);
      if ('error' in finalUpdateResult) {
        toast({ title: "Failed to Save Content Version", description: finalUpdateResult.error, variant: "destructive"});
      } else {
        toast({ title: "Content Generation Complete!", description: "Your multi-format content is ready for preview and performance analysis." });
      }
      

    } catch (error) {
      console.error("Campaign Generation Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Campaign Generation Failed", description: errorMessage, variant: "destructive" });
      await updateCampaignAPI(campaign.id, { status: 'draft' }); 
      setCurrentCampaignOverallStatus('draft');
      setIsDebating(false);
    } finally {
      setIsGeneratingCampaign(false); 
      setRefreshCampaignListTrigger(prev => prev + 1); // Refresh list to show updated status
    }
  };


  const handleViewVersion = (version: ContentVersion) => {
    setMultiFormatContent(version.multiFormatContentSnapshot);
    setActiveTab('preview');
    toast({title: `Viewing Version ${version.versionNumber}`, description: `Displaying content snapshot from ${new Date(version.timestamp).toLocaleString()}`});
  };


  const handleCampaignSelectionFromList = async (campaignId: string | null, action: 'view' | 'edit') => {
    setSelectedCampaignForEditingInForm(null); 

    if (!campaignId) {
      setSelectedCampaignForProcessing(null);
      setActiveTab('campaign-hub'); 
      return;
    }

    try {
      const campaignsResponse = await fetch(`/api/campaigns`);
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
            ? campaignToSelect.contentVersions[campaignToSelect.contentVersions.length - 1] 
            : null;

        if (latestVersion) {
             toast({ title: "Viewing Campaign", description: `Displaying latest content for "${campaignToSelect.title}".`});
             setActiveTab('preview');
        } else if (['draft', 'debating', 'generating'].includes(campaignToSelect.status) ) {
            toast({ title: `Campaign Status: ${campaignToSelect.status}`, description: `Generate content for "${campaignToSelect.title}" or edit the brief.`});
            setSelectedCampaignForEditingInForm(campaignToSelect); 
            setActiveTab('generator');
        } else { 
            toast({ title: "Viewing Campaign", description: `No content versions found for "${campaignToSelect.title}". Consider re-generating or editing.`});
            setActiveTab('preview');
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
        const displayTitle = selectedCampaignForProcessing.title.substring(0, 70) + (selectedCampaignForProcessing.title.length > 70 ? "..." : "");
        setCurrentDebateTopic(`Debate for: "${displayTitle}"`);
        setContentVersions(selectedCampaignForProcessing.contentVersions || []);
        const latestVersion = selectedCampaignForProcessing.contentVersions && selectedCampaignForProcessing.contentVersions.length > 0 
            ? selectedCampaignForProcessing.contentVersions[selectedCampaignForProcessing.contentVersions.length - 1] 
            : null;
        setMultiFormatContent(latestVersion ? latestVersion.multiFormatContentSnapshot : null);
        
        // Populate debate messages from stored campaign.agentDebates
        const storedDebateMessages: AgentMessage[] = (selectedCampaignForProcessing.agentDebates || []).map((interaction, index) => {
            // Attempt to find a matching agent role, default if not found
            const roleMatch = agentRolesForDebate.find(r => interaction.agent.toLowerCase().includes(r.split(' ')[0].toLowerCase())) || 'Orchestrator';
            return {
                agentId: `stored-agent-${index}`,
                agentName: interaction.agent,
                agentRole: roleMatch as AgentRole, // Cast as AgentRole, ensure roles are comprehensive
                message: interaction.message,
                timestamp: new Date(interaction.timestamp),
                type: 'statement' // Default type, could be enhanced
            };
        });
        setDebateMessages(storedDebateMessages);


    } else {
        setCurrentCampaignOverallStatus('draft');
        setCurrentDebateTopic(undefined);
        setDebateMessages([]);
        setMultiFormatContent(null);
        setContentVersions([]);
    }
  }, [selectedCampaignForProcessing]);


  const getStatusBadgeIcon = (status: CampaignStatus) => {
    switch(status) {
      case 'draft': return <Lightbulb className="h-4 w-4 text-gray-500"/>;
      case 'debating': return <Users className="h-4 w-4 text-blue-500 animate-pulse"/>;
      case 'generating': return <Brain className="h-4 w-4 text-purple-500 animate-spin"/>; // Changed icon for generating
      case 'review': return <FileText className="h-4 w-4 text-yellow-500"/>; // Changed color to yellow for review
      case 'published': return <BadgeCheck className="h-4 w-4 text-green-500"/>; // Changed color to green
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

  const hasContentForPreview = multiFormatContent && Object.values(multiFormatContent).some(v => v && v.length > 0);
  const hasContentForPerformance = multiFormatContent && Object.values(multiFormatContent).some(v => v && v.length > 0);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">ContentCraft AI Dashboard</h1>
            <p className="text-lg text-muted-foreground">
            Orchestrate your AI creative team for powerful, multi-format content campaigns.
            </p>
        </div>
        <div className="flex items-center gap-2 p-2 border rounded-md bg-card min-w-[220px] justify-center shadow">
            {getStatusBadgeIcon(currentCampaignOverallStatus)}
            <span className="text-sm font-medium">{campaignStatusTextMap[currentCampaignOverallStatus]}</span>
        </div>
      </div>
      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1 h-auto flex-wrap p-1">
          <TabsTrigger value="campaign-hub" className="text-xs sm:text-sm"><ListChecks className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Campaigns</TabsTrigger>
          <TabsTrigger value="generator" className="text-xs sm:text-sm"><Lightbulb className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />{selectedCampaignForEditingInForm ? "Edit" : "New"} Brief</TabsTrigger>
          <TabsTrigger value="debate" className="text-xs sm:text-sm" disabled={!selectedCampaignForProcessing || (currentCampaignOverallStatus !== 'debating' && debateMessages.length === 0) }><Users className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />War Room</TabsTrigger>
          <TabsTrigger value="preview" className="text-xs sm:text-sm" disabled={!selectedCampaignForProcessing || !hasContentForPreview}><FileText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Preview</TabsTrigger>
          <TabsTrigger value="brand" className="text-xs sm:text-sm"><Sparkles className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Brand DNA</TabsTrigger>
          <TabsTrigger value="evolution" className="text-xs sm:text-sm" disabled={!selectedCampaignForProcessing || contentVersions.length === 0}><Activity className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Evolution</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs sm:text-sm" disabled={!selectedCampaignForProcessing || !hasContentForPerformance}><TrendingUp className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Performance</TabsTrigger>
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
                versions={contentVersions}
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
