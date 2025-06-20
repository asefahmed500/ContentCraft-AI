
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
import { Fingerprint, Users, Bot, Library, FileText, Activity, TrendingUp, BadgeCheck, ListChecks, Lightbulb, Brain, BarChartBig, CalendarDays, TestTube, Wand2 } from 'lucide-react'; 

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
    // Ensure complex objects like dates are in ISO string format for the API
    const serializedUpdates = {
        ...updates,
        agentDebates: updates.agentDebates?.map(ad => ({...ad, timestamp: new Date(ad.timestamp).toISOString()})),
        contentVersions: updates.contentVersions?.map(cv => ({...cv, timestamp: new Date(cv.timestamp).toISOString()})),
        // Ensure other date fields are also handled if they are part of 'updates'
        createdAt: updates.createdAt ? new Date(updates.createdAt).toISOString() : undefined,
        updatedAt: updates.updatedAt ? new Date(updates.updatedAt).toISOString() : new Date().toISOString(), // Always update 'updatedAt'
    };

    const response = await fetch(`/api/campaigns?id=${campaignId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serializedUpdates),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update campaign');
    }
    const campaignResult = await response.json();
    // Convert dates back to Date objects for client-side state
    return {
        ...campaignResult,
        createdAt: new Date(campaignResult.createdAt),
        updatedAt: new Date(campaignResult.updatedAt),
        agentDebates: (campaignResult.agentDebates || []).map((ad: AgentInteraction) => ({...ad, timestamp: new Date(ad.timestamp)})),
        contentVersions: (campaignResult.contentVersions || []).map((cv: ContentVersion) => ({...cv, timestamp: new Date(cv.timestamp)})),
        scheduledPosts: (campaignResult.scheduledPosts || []).map((sp: any) => ({...sp, scheduledAt: new Date(sp.scheduledAt)})),
        abTests: (campaignResult.abTests || []).map((ab: any) => ({...ab, createdAt: new Date(ab.createdAt)})),
        isPrivate: campaignResult.isPrivate ?? false,
    };
  } catch (error) {
    console.error("Error updating campaign:", error);
    return { error: error instanceof Error ? error.message : "An unknown error occurred." };
  }
}


export default function DashboardPage() {
  const [selectedCampaignForProcessing, setSelectedCampaignForProcessing] = useState<Campaign | null>(null); 
  const [selectedCampaignForEditingInForm, setSelectedCampaignForEditingInForm] = useState<Campaign | null>(null);
  
  const [multiFormatContent, setMultiFormatContent] = useState<MultiFormatContent | null>(null);
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false); 
  const [isDebating, setIsDebating] = useState(false); 
  const [currentDebateTopic, setCurrentDebateTopic] = useState<string | undefined>(undefined);
  const [refreshCampaignListTrigger, setRefreshCampaignListTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("campaign-hub");

  const { toast } = useToast();

  const agentRolesForDebate: AgentRole[] = ["Creative Director", "Content Writer", "Brand Persona", "Analytics Strategist", "SEO Optimization", "Quality Assurance"]; // Orchestrator is simulated separately
  const orchestratorAgentName: AgentInteraction['agent'] = "Orchestrator";

  // Derived states from selectedCampaignForProcessing
  const campaignStatus: CampaignStatus | undefined = selectedCampaignForProcessing?.status;
  const debateMessages: AgentInteraction[] = selectedCampaignForProcessing?.agentDebates || [];
  const contentVersions: ContentVersion[] = selectedCampaignForProcessing?.contentVersions?.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [];
  const latestContentVersion: ContentVersion | null = contentVersions[0] || null;
  const latestContentVersionId: string | undefined = latestContentVersion?.id;

  useEffect(() => {
    if (selectedCampaignForProcessing) {
      setCurrentDebateTopic(`Debate for: "${selectedCampaignForProcessing.title.substring(0, 70)}${selectedCampaignForProcessing.title.length > 70 ? "..." : ""}"`);
      const currentLatestVersionToSet = selectedCampaignForProcessing.contentVersions?.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      setMultiFormatContent(currentLatestVersionToSet ? currentLatestVersionToSet.multiFormatContentSnapshot : null);
      
      const currentStatus = selectedCampaignForProcessing.status;
      setIsDebating(currentStatus === 'debating');
      // isGeneratingCampaign covers both debating and actual content generation phases
      setIsGeneratingCampaign(currentStatus === 'debating' || currentStatus === 'generating');
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
    
    // Ensure campaign object has dates correctly parsed
    const campaignWithClientDefaults: Campaign = { 
        ...campaign,
        createdAt: new Date(campaign.createdAt),
        updatedAt: new Date(campaign.updatedAt),
        agentDebates: (campaign.agentDebates || []).map(ad => ({...ad, timestamp: new Date(ad.timestamp)})),
        contentVersions: (campaign.contentVersions || []).map(cv => ({...cv, timestamp: new Date(cv.timestamp)})),
        scheduledPosts: (campaign.scheduledPosts || []).map((sp: any) => ({...sp, scheduledAt: new Date(sp.scheduledAt)})),
        abTests: (campaign.abTests || []).map((ab: any) => ({...ab, createdAt: new Date(ab.createdAt)})),
        isPrivate: campaign.isPrivate ?? false,
    };
    setSelectedCampaignForProcessing(campaignWithClientDefaults); 
    
    const currentLatestVersion = campaignWithClientDefaults.contentVersions?.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    setMultiFormatContent(currentLatestVersion ? currentLatestVersion.multiFormatContentSnapshot : null);
    
    setSelectedCampaignForEditingInForm(null); 
  }, []);
  
  const persistCurrentCampaignUpdates = useCallback(async (campaignToPersist?: Campaign | null) => {
    const campaign = campaignToPersist || selectedCampaignForProcessing;
    if (!campaign || !campaign.id) return campaign; 

    const result = await updateCampaignAPI(campaign.id, campaign); 
    if ('error' in result) {
        toast({ title: "Failed to Save Campaign Updates", description: result.error, variant: "destructive"});
        return campaign; // Return original on error to avoid corrupting state
    } else {
        const updatedCampaignWithClientDefaults: Campaign = { // Ensure result is typed as Campaign
            ...result,
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt),
            agentDebates: (result.agentDebates || []).map(ad => ({...ad, timestamp: new Date(ad.timestamp)})),
            contentVersions: (result.contentVersions || []).map(cv => ({...cv, timestamp: new Date(cv.timestamp)})),
            scheduledPosts: (result.scheduledPosts || []).map((sp: any) => ({...sp, scheduledAt: new Date(sp.scheduledAt)})),
            abTests: (result.abTests || []).map((ab: any) => ({...ab, createdAt: new Date(ab.createdAt)})),
            isPrivate: result.isPrivate ?? false,
        };
        setSelectedCampaignForProcessing(updatedCampaignWithClientDefaults); 
        setRefreshCampaignListTrigger(prev => prev + 1); 
        return updatedCampaignWithClientDefaults; 
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
        agentDebates: campaign.agentDebates || [], 
        contentVersions: campaign.contentVersions || [] 
    };
    setMultiFormatContent(null); 
    
    let updatedCampaign = await persistCurrentCampaignUpdates(currentCampaignState);
    if (!updatedCampaign || 'error' in updatedCampaign) {
         setIsGeneratingCampaign(false); setIsDebating(false); return;
    }
    currentCampaignState = updatedCampaign;
    setSelectedCampaignForProcessing(currentCampaignState); 
    
    const displayTitle = currentCampaignState.title.substring(0, 50);
    const campaignTitleForDebate = `Debate for: "${displayTitle}${currentCampaignState.title.length > 50 ? "..." : ""}"`;
    setCurrentDebateTopic(campaignTitleForDebate); 
    setActiveTab('debate');

    toast({ title: "Campaign Processing Started", description: `Agents are now debating strategy for "${currentCampaignState.title}".` });

    try {
      let augmentedBrief = `Campaign Title: ${currentCampaignState.title}\nProduct/Service Description: ${currentCampaignState.brief}`;
      if (currentCampaignState.targetAudience) augmentedBrief += `\nTarget Audience: ${currentCampaignState.targetAudience}`;
      if (currentCampaignState.tone) augmentedBrief += `\nDesired Tone: ${currentCampaignState.tone}`;
      if (currentCampaignState.contentGoals && currentCampaignState.contentGoals.length > 0) augmentedBrief += `\nContent Goals: ${currentCampaignState.contentGoals.join(', ')}`;

      const debateInput: AgentDebateInput = {
        topic: `Formulate content strategy for a campaign about: ${augmentedBrief}. Consider key messages, angles, potential pitfalls, and content formats. Each agent should offer specific, actionable feedback or proposals.`,
        initialContent: augmentedBrief,
        agentRoles: agentRolesForDebate, // Pass the list of roles for the AI to consider
      };
      const debateResult = await agentDebateAction(debateInput);

      if ('error' in debateResult) {
        throw new Error(`Debate failed: ${debateResult.error}`);
      }
      
      const debateInteractions: AgentInteraction[] = [];
      let messageTimestamp = new Date().getTime();

      const addDebateMessage = (role: AgentRole | 'Orchestrator', message: string, agentIdSuffix: string = '01') => {
        debateInteractions.push({
          agent: role, 
          agentName: role, 
          agentId: `${role.toLowerCase().replace(/\s+/g, '-')}-${agentIdSuffix}`,
          type: 'statement',
          role: role as AgentRole, // Cast here, ensure Orchestrator is handled or role type is extended
          message: message,
          timestamp: new Date(messageTimestamp),
        });
        messageTimestamp += (Math.random() * 1500) + 500; // Increment timestamp by 0.5-2 seconds
      };
      
      addDebateMessage('Orchestrator', `Debate initiated for campaign: "${currentCampaignState.title}".\nTopic: ${debateInput.topic}\nParticipating agents: ${debateInput.agentRoles.join(', ')}.\nFocusing on strategy refinement and key messaging.`);

      // Simulate messages from other agents based on AI output
      agentRolesForDebate.forEach((role, index) => {
        let simulatedMessage = `As the ${role}, I suggest we `;
        if (debateResult.contentSuggestions && debateResult.contentSuggestions.length > index) {
          simulatedMessage += `focus on: "${debateResult.contentSuggestions[index]}". `;
        } else if (debateResult.contentSuggestions && debateResult.contentSuggestions.length > 0) {
          // Fallback to first suggestion or generic comment
          simulatedMessage += `align with the core suggestion of "${debateResult.contentSuggestions[0]}". `;
        } else {
          simulatedMessage += `contribute to developing a strong core message. `;
        }

        // Add some role-specific flavoring
        switch(role) {
            case 'Creative Director':
                simulatedMessage += "Let's ensure the overall vision is compelling.";
                break;
            case 'Content Writer':
                simulatedMessage += "I'll craft engaging narratives around these points.";
                break;
            case 'Brand Persona':
                simulatedMessage += `This needs to resonate with our brand's voice: ${currentCampaignState.tone || 'authentic and engaging'}.`;
                break;
            case 'Analytics Strategist':
                simulatedMessage += "We should consider how we'll measure success for these angles.";
                break;
            case 'SEO Optimization':
                const keywords = debateResult.debateSummary.match(/keywords: ([\w\s,]+)/i);
                if (keywords && keywords[1]) {
                     simulatedMessage += ` Good point on SEO. Let's target keywords like: ${keywords[1].trim()}.`;
                } else {
                    simulatedMessage += "We must integrate relevant keywords for visibility.";
                }
                break;
            case 'Quality Assurance':
                simulatedMessage += "I'll be checking for clarity, consistency, and any potential compliance issues.";
                break;
            default:
                simulatedMessage += "My input will be crucial here.";
        }
        addDebateMessage(role, simulatedMessage, `s${index + 1}`);
      });
      
      addDebateMessage('Orchestrator', `Debate Concluded.\n\n**Summary of Key Points & Decisions**:\n${debateResult.debateSummary}\n\n**Consolidated Suggestions for Content Generation**:\n- ${debateResult.contentSuggestions.join('\n- ') || 'General strategic alignment based on discussion.'}\n\nProceeding to content generation based on these insights.`, 'summary');
      
      currentCampaignState = {...currentCampaignState, agentDebates: debateInteractions, status: 'generating' as CampaignStatus};
      updatedCampaign = await persistCurrentCampaignUpdates(currentCampaignState);
      if (!updatedCampaign || 'error' in updatedCampaign) {
          setIsGeneratingCampaign(false); setIsDebating(false); return; // Stop if update fails
      }
      currentCampaignState = updatedCampaign;
      setSelectedCampaignForProcessing(currentCampaignState); // Update main state
      
      setIsDebating(false); 
      toast({ title: "Debate Phase Complete", description: "Agents have concluded the strategy session. Now generating multi-format content." });
      setActiveTab('preview');


      const contentInput: GenerateContentInput = {
        inputContent: `${augmentedBrief}\n\nKey insights from debate: ${debateResult.debateSummary}\nKey Suggestions and Agreements: ${debateResult.contentSuggestions.join('; ')}`,
        brandVoice: brandVoiceOverride || currentCampaignState.tone, // Use campaign tone if no override
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
      updatedCampaign = await persistCurrentCampaignUpdates(currentCampaignState);
      if (!updatedCampaign || 'error' in updatedCampaign) { /* handle error silently or log */ }
      else { currentCampaignState = updatedCampaign; }
      
      setSelectedCampaignForProcessing(currentCampaignState); // Final update to main state
      toast({ title: "Content Generation Complete!", description: "Your final draft of multi-format content is ready for preview. (+50 XP)" });
      
    } catch (error) {
      console.error("Campaign Generation Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Campaign Generation Failed", description: errorMessage, variant: "destructive" });
       if (selectedCampaignForProcessing && selectedCampaignForProcessing.id) { 
            // Attempt to revert campaign status in DB
            const revertedCampaignState = {
                ...selectedCampaignForProcessing, // Use the state *before* this attempt if possible
                status: 'draft' as CampaignStatus, 
            }; 
            const revertedCampaign = await persistCurrentCampaignUpdates(revertedCampaignState);
            if (revertedCampaign && !('error' in revertedCampaign)) {
                setSelectedCampaignForProcessing(revertedCampaign);
            }
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
      return;
    }

    try {
      // Fetch the single campaign using the specific API endpoint structure
      const campaignResponse = await fetch(`/api/campaigns?id=${campaignId}&single=true`); 
      if (!campaignResponse.ok) {
          const errorData = await campaignResponse.json();
          throw new Error(errorData.error || "Failed to fetch the selected campaign.");
      }
      let campaignToSelect: Campaign = await campaignResponse.json();

      if (!campaignToSelect || !campaignToSelect.id) { // Check if id exists
        toast({ title: "Error", description: "Campaign not found or invalid data.", variant: "destructive" });
        setSelectedCampaignForProcessing(null); return;
      }
      
      campaignToSelect = { // Ensure all fields are correctly typed and initialized
        ...campaignToSelect,
        createdAt: new Date(campaignToSelect.createdAt),
        updatedAt: new Date(campaignToSelect.updatedAt),
        agentDebates: (campaignToSelect.agentDebates || []).map(ad => ({...ad, timestamp: new Date(ad.timestamp)})),
        contentVersions: (campaignToSelect.contentVersions || []).map(cv => ({...cv, timestamp: new Date(cv.timestamp)})),
        scheduledPosts: (campaignToSelect.scheduledPosts || []).map((sp: any) => ({...sp, scheduledAt: new Date(sp.scheduledAt)})),
        abTests: (campaignToSelect.abTests || []).map((ab: any) => ({...ab, createdAt: new Date(ab.createdAt)})),
        isPrivate: campaignToSelect.isPrivate ?? false,
      };

      setSelectedCampaignForProcessing(campaignToSelect); 
      
      if (action === 'edit') {
        setSelectedCampaignForEditingInForm(campaignToSelect); 
        setActiveTab('generator'); 
        toast({ title: "Editing Campaign", description: `Loaded "${campaignToSelect.title}" for editing.`});
      } else if (action === 'view') {
        const currentLatestVersionToView = campaignToSelect.contentVersions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        // setMultiFormatContent is handled by useEffect reacting to selectedCampaignForProcessing change

        if (currentLatestVersionToView) {
             toast({ title: "Viewing Campaign", description: `Displaying latest content for "${campaignToSelect.title}".`});
             setActiveTab('preview');
        } else if (['draft', 'debating', 'generating'].includes(campaignToSelect.status) ) {
            toast({ title: `Campaign Status: ${campaignToSelect.status}`, description: `Generate content for "${campaignToSelect.title}" or edit the brief.`});
            setSelectedCampaignForEditingInForm(campaignToSelect); 
            setActiveTab('generator');
        } else { 
            toast({ title: "Viewing Campaign", description: `No content versions found for "${campaignToSelect.title}". Consider re-generating or editing.`});
            setSelectedCampaignForEditingInForm(campaignToSelect); 
            setActiveTab('generator');
        }
      }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load campaign details.";
        toast({ title: "Error Loading Campaign", description: errorMessage, variant: "destructive" });
        setSelectedCampaignForProcessing(null); 
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

  const getStatusBadgeIcon = (status: CampaignStatus | undefined) => {
    if (!status) return <Lightbulb className="h-4 w-4 text-gray-500"/>;
    switch(status) {
      case 'draft': return <Lightbulb className="h-4 w-4 text-gray-500"/>;
      case 'debating': return <Users className="h-4 w-4 text-blue-500 animate-pulse"/>;
      case 'generating': return <Brain className="h-4 w-4 text-purple-500 animate-spin"/>; 
      case 'review': return <FileText className="h-4 w-4 text-yellow-500"/>; 
      case 'published': return <BadgeCheck className="h-4 w-4 text-green-500"/>;
      case 'archived': return <Library className="h-4 w-4 text-gray-400"/>; // Changed icon for archived
      default: return <Lightbulb className="h-4 w-4 text-gray-500"/>;
    }
  };
  
  const hasContentForPreview = multiFormatContent && Object.values(multiFormatContent).some(v => v && typeof v === 'string' && v.length > 0);

  const handleRequestContentGenerationForPerformance = () => {
    if (selectedCampaignForProcessing) {
        handleGenerateContentForCampaign(selectedCampaignForProcessing); // Re-trigger generation
        setActiveTab('preview'); 
    } else {
        toast({title: "No Campaign Selected", description: "Please select or create a campaign first.", variant: "destructive"});
        setActiveTab('campaign-hub'); // Guide user back to select/create
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
                <span className="text-sm font-medium">{campaignStatus ? campaignStatusTextMap[campaignStatus] : 'N/A'}</span>
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
                    // Ensure role is correctly typed and matches AgentRole
                    agentRole: (interaction.role || agentRolesForDebate.find(r => interaction.agent.toLowerCase().includes(r.split(' ')[0].toLowerCase())) || 'Orchestrator') as AgentRole, 
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
                versions={contentVersions} 
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

    