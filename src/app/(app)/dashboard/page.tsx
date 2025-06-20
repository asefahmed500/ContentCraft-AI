"use client";

import { useState } from 'react';
import { BrandDNAAnalyzer } from './components/BrandDNAAnalyzer';
import { AgentDebatePanel } from './components/AgentDebatePanel';
import { MultiFormatPreview } from './components/MultiFormatPreview';
import { CampaignGenerator } from './components/CampaignGenerator';
import type { AgentDebateInput, AgentDebateOutput } from '@/ai/flows/agent-debate';
import { agentDebate } from '@/ai/flows/agent-debate';
import type { GenerateContentInput, GenerateContentOutput } from '@/ai/flows/content-generation';
import { generateContent } from '@/ai/flows/content-generation';
import type { AgentMessage } from '@/types/agent';
import type { MultiFormatContent } from '@/types/content';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Users, Bot, Library, FileText } from 'lucide-react';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDebating, setIsDebating] = useState(false);
  const [currentDebateTopic, setCurrentDebateTopic] = useState<string | undefined>(undefined);

  const { toast } = useToast();

  const predefinedAgentRoles = [
    "Creative Director", "Content Writer", "Brand Persona", 
    "Analytics Strategist", "Visual Content", "SEO Optimization", "Quality Assurance"
  ];

  const handleGenerateCampaign = async (brief: string, brandVoice?: string) => {
    setIsGenerating(true);
    setIsDebating(true);
    setDebateMessages([]);
    setMultiFormatContent(null);
    setCurrentDebateTopic(`Campaign for: "${brief.substring(0, 50)}..."`);

    toast({ title: "Campaign Generation Started", description: "Agents are now working on your brief." });

    try {
      // Step 1: Agent Debate
      const debateInput: AgentDebateInput = {
        topic: `Campaign strategy for: ${brief}`,
        initialContent: brief,
        agentRoles: predefinedAgentRoles,
      };
      const debateResult = await agentDebateAction(debateInput);

      if ('error' in debateResult) {
        throw new Error(`Debate failed: ${debateResult.error}`);
      }
      
      // Simulate debate messages from summary (simplified)
      const newDebateMessages: AgentMessage[] = [
        { agentId: 'orchestrator', agentName: 'Orchestrator', agentRole: 'Orchestrator', message: `Debate initiated for: ${brief}`, timestamp: new Date(), type: 'statement'},
        { agentId: 'agent-cd', agentName: 'Creative Director', agentRole: 'Creative Director', message: "Let's ensure bold, authentic messaging.", timestamp: new Date(), type: 'statement' },
        { agentId: 'agent-cw', agentName: 'Content Writer', agentRole: 'Content Writer', message: "How about 'Skin that speaks your truth'?", timestamp: new Date(), type: 'suggestion' },
        { agentId: 'agent-bp', agentName: 'Brand Persona', agentRole: 'Brand Persona', message: "Too generic. Gen Z wants transparency.", timestamp: new Date(), type: 'critique' },
        { agentId: 'orchestrator', agentName: 'Orchestrator', agentRole: 'Orchestrator', message: `Debate Summary: ${debateResult.debateSummary}`, timestamp: new Date(), type: 'statement'},
      ];
      setDebateMessages(newDebateMessages);
      setIsDebating(false);
      toast({ title: "Debate Phase Complete", description: "Agents have concluded their discussion." });

      // Step 2: Content Generation
      const contentInput: GenerateContentInput = {
        inputContent: `${brief}\n\nKey insights from debate: ${debateResult.debateSummary}\n${debateResult.contentSuggestions.join('\n')}`,
        brandVoice: brandVoice, // Use provided brand voice or let AI infer
      };
      const contentResult = await generateContentAction(contentInput);

      if ('error' in contentResult) {
        throw new Error(`Content generation failed: ${contentResult.error}`);
      }

      setMultiFormatContent(contentResult);
      toast({ title: "Content Generation Complete", description: "Multi-format content is ready for preview." });

    } catch (error) {
      console.error("Campaign Generation Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during campaign generation.";
      toast({ title: "Campaign Generation Failed", description: errorMessage, variant: "destructive" });
      setIsDebating(false);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">ContentCraft AI Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Orchestrate your AI creative team and generate stunning content campaigns.
        </p>
      </div>
      <Separator />

      <Tabs defaultValue="campaign" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:max-w-md">
          <TabsTrigger value="campaign"><Bot className="mr-2 h-4 w-4" />Campaign Hub</TabsTrigger>
          <TabsTrigger value="brand"><Sparkles className="mr-2 h-4 w-4" />Brand DNA</TabsTrigger>
          {/* Placeholder for future tabs like Analytics, Content Library */}
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
              <MultiFormatPreview content={multiFormatContent} isLoading={isGenerating && !multiFormatContent} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="brand" className="mt-6">
          <BrandDNAAnalyzer />
        </TabsContent>
        
        <TabsContent value="library" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Library className="h-6 w-6 text-primary"/>Content Library</CardTitle>
                    <CardDescription>Manage and review all your generated content campaigns.</CardDescription>
                </CardHeader>
                <CardContent className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                    <FileText size={48} className="mb-4"/>
                    <p>Content Library feature coming soon!</p>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* Example of how CreativeWarRoom.tsx from prompt could be structured here */}
      {/* 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-1"> <CampaignGenerator /> <BrandDNAAnalyzer /> </div>
        <div className="lg:col-span-1"> <AgentDebatePanel /> </div>
        <div className="lg:col-span-1"> <MultiFormatPreview /> </div>
      </div>
      */}
      {/* Placeholder for ContentEvolutionTimeline and PerformancePredictor */}
      {/* <Card className="mt-6">
        <CardHeader><CardTitle className="font-headline">Content Evolution & Performance</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Timeline and performance metrics coming soon.</p></CardContent>
      </Card> */}
    </div>
  );
}
