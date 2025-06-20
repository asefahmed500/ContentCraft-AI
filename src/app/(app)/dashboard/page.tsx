"use client";

import { useState } from 'react';
import { BrandDNAAnalyzer } from './components/BrandDNAAnalyzer';
import { AgentDebatePanel } from './components/AgentDebatePanel';
import { MultiFormatPreview } from './components/MultiFormatPreview';
import { CampaignGenerator } from './components/CampaignGenerator';
import { ContentEvolutionTimeline } from './components/ContentEvolutionTimeline'; // New
import { PerformancePredictor } from './components/PerformancePredictor'; // New
import type { AgentDebateInput, AgentDebateOutput } from '@/ai/flows/agent-debate';
import { agentDebate } from '@/ai/flows/agent-debate';
import type { GenerateContentInput, GenerateContentOutput } from '@/ai/flows/content-generation';
import { generateContent } from '@/ai/flows/content-generation';
import type { AgentMessage } from '@/types/agent';
import type { MultiFormatContent, CampaignStatus } from '@/types/content';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Users, Bot, Library, FileText, Activity, TrendingUp, BadgeCheck } from 'lucide-react';

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
  const [isGenerating, setIsGenerating] = useState(false); // Overall campaign generation
  const [isDebating, setIsDebating] = useState(false); // Specific to debate phase
  const [currentDebateTopic, setCurrentDebateTopic] = useState<string | undefined>(undefined);
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>('draft');

  const { toast } = useToast();

  const predefinedAgentRoles = [
    "Creative Director", "Content Writer", "Brand Persona", 
    "Analytics Strategist", "Visual Content", "SEO Optimization", "Quality Assurance"
  ];

  const handleGenerateCampaign = async (
    brief: string, 
    brandVoice?: string,
    targetAudience?: string, // New
    tone?: string, // New
    contentGoals?: string[] // New
  ) => {
    setIsGenerating(true);
    setIsDebating(true);
    setCampaignStatus('debating');
    setDebateMessages([]);
    setMultiFormatContent(null);
    
    const displayBrief = brief.substring(0, 50);
    const displayAudience = targetAudience ? `, for ${targetAudience.substring(0,30)}` : '';
    const displayTone = tone ? `, with ${tone} tone` : '';
    const campaignTitle = `Campaign: "${displayBrief}..."${displayAudience}${displayTone}`;
    setCurrentDebateTopic(campaignTitle);

    toast({ title: "Campaign Generation Started", description: "Agents are now working on your brief." });

    try {
      // Augment brief with new inputs for AI
      let augmentedBrief = brief;
      if (targetAudience) augmentedBrief += `\nTarget Audience: ${targetAudience}`;
      if (tone) augmentedBrief += `\nDesired Tone: ${tone}`;
      if (contentGoals && contentGoals.length > 0) augmentedBrief += `\nContent Goals: ${contentGoals.join(', ')}`;

      // Step 1: Agent Debate
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
      setCampaignStatus('generating'); // Generating content after debate
      toast({ title: "Debate Phase Complete", description: "Agents have concluded their discussion. Now generating content." });

      // Step 2: Content Generation
      const contentInput: GenerateContentInput = {
        inputContent: `${augmentedBrief}\n\nKey insights from debate: ${debateResult.debateSummary}\n${debateResult.contentSuggestions.join('\n')}`,
        brandVoice: brandVoice,
      };
      const contentResult = await generateContentAction(contentInput);

      if ('error' in contentResult) {
        throw new Error(`Content generation failed: ${contentResult.error}`);
      }

      setMultiFormatContent(contentResult);
      setCampaignStatus('review'); // Ready for review
      toast({ title: "Content Generation Complete", description: "Multi-format content is ready for preview." });

    } catch (error) {
      console.error("Campaign Generation Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during campaign generation.";
      toast({ title: "Campaign Generation Failed", description: errorMessage, variant: "destructive" });
      setCampaignStatus('draft'); // Reset to draft on failure
      setIsDebating(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch(status) {
      case 'draft': return <BadgeCheck className="h-4 w-4 text-gray-500"/>;
      case 'debating': return <Users className="h-4 w-4 text-blue-500 animate-pulse"/>;
      case 'generating': return <Bot className="h-4 w-4 text-purple-500 animate-spin"/>;
      case 'review': return <FileText className="h-4 w-4 text-green-500"/>;
      case 'published': return <Activity className="h-4 w-4 text-teal-500"/>;
      case 'archived': return <Library className="h-4 w-4 text-gray-400"/>;
      default: return null;
    }
  };
  
  const campaignStatusText = {
    draft: "Draft - Ready to start",
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
            {getStatusBadge(campaignStatus)}
            <span className="text-sm font-medium">{campaignStatusText[campaignStatus]}</span>
        </div>
      </div>
      <Separator />

      <Tabs defaultValue="campaign" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:max-w-2xl">
          <TabsTrigger value="campaign"><Bot className="mr-2 h-4 w-4" />Campaign Hub</TabsTrigger>
          <TabsTrigger value="brand"><Sparkles className="mr-2 h-4 w-4" />Brand DNA</TabsTrigger>
          <TabsTrigger value="evolution"><Activity className="mr-2 h-4 w-4" />Evolution</TabsTrigger>
          <TabsTrigger value="performance"><TrendingUp className="mr-2 h-4 w-4" />Performance</TabsTrigger>
          <TabsTrigger value="library" disabled><Library className="mr-2 h-4 w-4" />Content Library</TabsTrigger>
        </TabsList>

        <TabsContent value="campaign" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <CampaignGenerator onGenerateCampaign={handleGenerateCampaign} isGenerating={isGenerating} />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <AgentDebatePanel debateMessages={debateMessages} isDebating={isDebating} debateTopic={currentDebateTopic} />
            </div>
            <div className="lg:col-span-3">
              <MultiFormatPreview content={multiFormatContent} isLoading={isGenerating && campaignStatus === 'generating' && !multiFormatContent} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="brand" className="mt-6">
          <BrandDNAAnalyzer />
        </TabsContent>

        <TabsContent value="evolution" className="mt-6">
            <ContentEvolutionTimeline campaignId="current" contentVersions={multiFormatContent ? [{id: 'v1', text: JSON.stringify(multiFormatContent, null, 2), agentName: 'AI Team', timestamp: new Date(), changeSummary: 'Initial generation based on brief and debate.'}] : []} />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
            <PerformancePredictor campaignId="current" contentToAnalyze={multiFormatContent} />
        </TabsContent>
        
        <TabsContent value="library" className="mt-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
