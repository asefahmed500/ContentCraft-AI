
"use client";

import type { Campaign, ContentVersion, AgentInteraction, MultiFormatContent, ScheduledPost } from '@/types/content';
import type { BrandProfile } from '@/types/brand';
import { useState, useTransition, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Beaker, FileText, Sparkles, ArrowLeft, Bot, MessageSquare, Microscope, FlaskConical, PencilRuler, SearchCheck, CheckCircle2, CalendarDays, Languages, Zap, Pencil, Save, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { analyzeBrandProfile } from '@/ai/flows/brand-learning';
import { AgentDebateDisplay } from '@/components/AgentDebateDisplay';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { ContentCalendarDisplay } from './ContentCalendarDisplay';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSession } from 'next-auth/react';

interface CampaignDetailClientProps {
  initialCampaign: Campaign;
  onBack: () => void;
  onCampaignUpdate: (updatedCampaign: Campaign) => void;
}

const campaignEditSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.').max(100, 'Title is too long.'),
  brief: z.string().min(10, 'Brief must be at least 10 characters long.').max(1000, 'Brief is too long.'),
  targetAudience: z.string().max(200, 'Target audience description is too long.').optional(),
  tone: z.string().max(100, 'Tone description is too long.').optional(),
});
type CampaignEditValues = z.infer<typeof campaignEditSchema>;


// Helper to convert base64 to data URI
const textToDataUri = (text: string) => {
    const base64 = btoa(unescape(encodeURIComponent(text)));
    return `data:text/plain;base64,${base64}`;
}

type SubmittedFeedback = {
  [key: string]: 'up' | 'down'; // key is "versionId-format"
};

export function CampaignDetailClient({ initialCampaign, onBack, onCampaignUpdate }: CampaignDetailClientProps) {
  const { toast } = useToast();
  const { data: session, update: updateSession } = useSession();
  const [campaign, setCampaign] = useState<Campaign>(initialCampaign);
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [isAnalyzeDialogOpen, setIsAnalyzeDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Loading states
  const [isDebating, setIsDebating] = useState(false);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);

  // Form for editing campaign
  const form = useForm<CampaignEditValues>({
    resolver: zodResolver(campaignEditSchema),
    values: {
      title: campaign.title,
      brief: campaign.brief,
      targetAudience: campaign.targetAudience,
      tone: campaign.tone,
    },
  });

  // Brand Analysis State
  const [referenceText, setReferenceText] = useState('');
  
  // Feedback state
  const [submittedFeedback, setSubmittedFeedback] = useState<SubmittedFeedback>({});

  const fetchFeedbackHistory = useCallback(async () => {
    try {
        const response = await fetch(`/api/feedback?campaignId=${initialCampaign.id}`);
        if (!response.ok) return;
        const feedbackItems: { contentVersionId: string; contentFormat: string; rating: 1 | -1 }[] = await response.json();
        
        const feedbackMap: SubmittedFeedback = {};
        feedbackItems.forEach(item => {
            const key = `${item.contentVersionId}-${item.contentFormat}`;
            feedbackMap[key] = item.rating === 1 ? 'up' : 'down';
        });
        setSubmittedFeedback(feedbackMap);
    } catch (err) {
        console.error("Could not fetch feedback history", err);
    }
  }, [initialCampaign.id]);

  useEffect(() => {
    fetchFeedbackHistory();
  }, [fetchFeedbackHistory]);


  // Revise Content State
  const [isReviseDialogOpen, setIsReviseDialogOpen] = useState(false);
  const [contentToRevise, setContentToRevise] = useState<{ originalContent: string; contentType: string; version: ContentVersion } | null>(null);
  const [revisionInstructions, setRevisionInstructions] = useState('');
  const [revisedContent, setRevisedContent] = useState<string | null>(null);

  // Brand Audit State
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [auditResult, setAuditResult] = useState<{ alignmentScore: number; justification: string; suggestions: string[] } | null>(null);
  const [contentToAudit, setContentToAudit] = useState<string>('');
  
  // Translate Content State
  const [isTranslateDialogOpen, setIsTranslateDialogOpen] = useState(false);
  const [contentToTranslate, setContentToTranslate] = useState<{ originalContent: string; contentType: string; version: ContentVersion } | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [toneDescription, setToneDescription] = useState('');
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);

  // Optimize Content State
  const [isOptimizeDialogOpen, setIsOptimizeDialogOpen] = useState(false);
  const [contentToOptimize, setContentToOptimize] = useState<{ originalContent: string; contentType: string; version: ContentVersion } | null>(null);
  const [optimizationGoal, setOptimizationGoal] = useState('Improve user engagement');
  const [optimizationResult, setOptimizationResult] = useState<{ predictedPerformance: { score: number, justification: string }, optimizedContent: string, explanation: string } | null>(null);

  const awardXP = async (xp: number, action: string) => {
    try {
        const response = await fetch('/api/user/update-xp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ xpGained: xp }),
        });
        const result = await response.json();
        if (!response.ok) {
            console.error("Failed to award XP:", result.error || 'Unknown error');
            return;
        }

        await updateSession({
            user: {
                ...session?.user,
                totalXP: result.totalXP,
                level: result.level,
                badges: result.badges,
            }
        });
        
        toast({
            title: `+${xp} XP!`,
            description: `For ${action}.`,
        });

        if (result.leveledUp && result.gainedBadges.length > 0) {
            toast({
                title: `Level Up! You've reached Level ${result.level}!`,
                description: `New badge unlocked: ${result.gainedBadges.join(', ')}`,
            });
        } else if (result.leveledUp) {
            toast({
                title: `Level Up!`,
                description: `You've reached Level ${result.level}!`,
            });
        }
    } catch (err) {
        console.error("XP Awarding Error:", err);
    }
  };


  const handleUpdateCampaign = async (updatedData: Partial<Campaign>) => {
    try {
      const response = await fetch(`/api/campaigns?id=${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      const newlyUpdatedCampaign = result as Campaign;
      setCampaign(newlyUpdatedCampaign);
      onCampaignUpdate(newlyUpdatedCampaign);

      return newlyUpdatedCampaign;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Update Failed", description: errorMessage, variant: "destructive" });
      return null;
    }
  };

  const handleEditSubmit = async (data: CampaignEditValues) => {
    startTransition(async () => {
        const updatedCampaign = await handleUpdateCampaign(data);
        if (updatedCampaign) {
            toast({ title: "Campaign Updated", description: "Your campaign details have been saved." });
            setIsEditDialogOpen(false);
        }
    });
  };

  const handleAnalyzeBrand = async () => {
    if (!referenceText.trim()) {
      toast({ title: "Input Required", description: "Please paste some reference text to analyze.", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      try {
        const contentDataUri = textToDataUri(referenceText);
        const brandProfile = await analyzeBrandProfile({ contentDataUri });
        
        await handleUpdateCampaign({ brandProfile });

        toast({ title: "Brand Profile Generated", description: "The brand profile has been analyzed and saved." });
        await awardXP(25, "generating a Brand Profile");
        setIsAnalyzeDialogOpen(false);
        setReferenceText('');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        toast({ title: "Analysis Failed", description: errorMessage, variant: "destructive" });
      }
    });
  };

  const handleRunWarRoom = async () => {
     setIsDebating(true);
     try {
        const response = await fetch('/api/agents/debate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId: campaign.id }),
        });
        const updatedCampaign = await response.json();
        if (!response.ok) {
            throw new Error(updatedCampaign.error || 'Failed to run the war room.');
        }

        setCampaign(updatedCampaign as Campaign);
        onCampaignUpdate(updatedCampaign as Campaign);
        toast({ title: "War Room Concluded!", description: "The strategy session is complete and has been saved." });
        await awardXP(50, "completing a Strategy Session");
     } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        toast({ title: "War Room Error", description: errorMessage, variant: "destructive" });
     } finally {
        setIsDebating(false);
     }
  };

  const handleGenerateSchedule = async () => {
    setIsGeneratingSchedule(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/schedule`, {
          method: 'POST'
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate content schedule.');
      }

      const newlyUpdatedCampaign = result as Campaign;
      setCampaign(newlyUpdatedCampaign);
      onCampaignUpdate(newlyUpdatedCampaign);

      toast({ title: "Content Schedule Generated!", description: "Your 7-day content plan is ready." });
      await awardXP(30, "generating a Content Schedule");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Schedule Generation Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  const handleGenerateInitialContent = async () => {
    setIsGeneratingContent(true);
    try {
        const response = await fetch('/api/content/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId: campaign.id }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to generate content.");

        setCampaign(result as Campaign);
        onCampaignUpdate(result as Campaign);
        toast({ title: "Content Generated!", description: "Your first content version is ready for review." });
        await awardXP(40, "generating initial content");
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        toast({ title: "Generation Failed", description: errorMessage, variant: "destructive" });
    } finally {
        setIsGeneratingContent(false);
    }
  };

  const handleSaveAsNewVersion = async (
    newContent: string,
    format: string,
    sourceVersion: ContentVersion,
    changeSummary: string,
    actorName: string
  ) => {
    startTransition(async () => {
        const newSnapshot = { ...sourceVersion.multiFormatContentSnapshot, [format]: newContent };
        
        const newVersion: Omit<ContentVersion, 'id'> = {
            versionNumber: (campaign.contentVersions.length) + 1,
            timestamp: new Date(),
            actorName,
            changeSummary,
            multiFormatContentSnapshot: newSnapshot,
            isFlagged: false,
            adminModerationNotes: '',
        };

        const updatedCampaign = await handleUpdateCampaign({ contentVersions: [...campaign.contentVersions, newVersion as ContentVersion] });

        if (updatedCampaign) {
            toast({ title: "New Version Saved!", description: `Version ${newVersion.versionNumber} has been added to the campaign.` });
            await awardXP(15, "saving a new version");
            // Close all dialogs
            setIsReviseDialogOpen(false);
            setIsTranslateDialogOpen(false);
            setIsOptimizeDialogOpen(false);
        }
    });
  };

  const handleOpenReviseDialog = (originalContent: string, contentType: string, version: ContentVersion) => {
    setContentToRevise({ originalContent, contentType, version });
    setRevisionInstructions('');
    setRevisedContent(null);
    setIsReviseDialogOpen(true);
  };
  
  const handleReviseContent = async () => {
    if (!contentToRevise || !revisionInstructions.trim()) {
        toast({ title: "Input Required", description: "Please provide revision instructions.", variant: "destructive" });
        return;
    }
    startTransition(async () => {
        try {
            const response = await fetch('/api/content/revise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalContent: contentToRevise.originalContent,
                    contentType: contentToRevise.contentType,
                    revisionInstructions,
                    campaignId: campaign.id,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to revise content.');
            setRevisedContent(result.revisedContent);
            toast({ title: "Content Revised", description: "The AI has provided a revision below." });
            await awardXP(10, "revising content");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            toast({ title: "Revision Failed", description: errorMessage, variant: "destructive" });
        }
    });
  };

  const handleOpenAuditDialog = (content: string) => {
    setContentToAudit(content);
    setAuditResult(null);
    setIsAuditDialogOpen(true);
  };

  const handleRunAudit = async () => {
    if (!contentToAudit) return;
    startTransition(async () => {
      try {
        const response = await fetch('/api/brand/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentToCheck: contentToAudit, campaignId: campaign.id }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to run brand audit.');
        setAuditResult(result);
        toast({ title: "Audit Complete", description: "Brand alignment results are shown below." });
        await awardXP(10, "auditing content");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        toast({ title: "Audit Failed", description: errorMessage, variant: "destructive" });
      }
    });
  };
  
  const handleOpenTranslateDialog = (originalContent: string, contentType: string, version: ContentVersion) => {
    setContentToTranslate({ originalContent, contentType, version });
    setTargetLanguage('');
    setToneDescription('');
    setTranslatedContent(null);
    setIsTranslateDialogOpen(true);
  };

  const handleTranslateContent = async () => {
    if (!contentToTranslate || !targetLanguage.trim()) {
        toast({ title: "Input Required", description: "Please enter a target language.", variant: "destructive" });
        return;
    }
    startTransition(async () => {
        try {
            const response = await fetch('/api/content/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalContent: contentToTranslate.originalContent,
                    targetLanguage: targetLanguage,
                    toneDescription: toneDescription,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to translate content.');
            setTranslatedContent(result.translatedContent);
            toast({ title: "Translation Complete", description: `Content translated to ${targetLanguage}.` });
            await awardXP(10, "translating content");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            toast({ title: "Translation Failed", description: errorMessage, variant: "destructive" });
        }
    });
  };

  const handleOpenOptimizeDialog = (originalContent: string, contentType: string, version: ContentVersion) => {
    setContentToOptimize({ originalContent, contentType, version });
    setOptimizationGoal('Improve user engagement');
    setOptimizationResult(null);
    setIsOptimizeDialogOpen(true);
  };
  
  const handleOptimizeContent = async () => {
    if (!contentToOptimize || !optimizationGoal.trim()) {
        toast({ title: "Input Required", description: "Please select an optimization goal.", variant: "destructive" });
        return;
    }
    startTransition(async () => {
        try {
            const response = await fetch('/api/content/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalContent: contentToOptimize.originalContent,
                    contentType: contentToOptimize.contentType,
                    optimizationGoal,
                    campaignId: campaign.id,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to optimize content.');
            setOptimizationResult(result);
            toast({ title: "Optimization Complete", description: "The AI has provided an optimized version below." });
            await awardXP(10, "optimizing content");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            toast({ title: "Optimization Failed", description: errorMessage, variant: "destructive" });
        }
    });
  };

  const handleFeedbackSubmit = async (version: ContentVersion, format: string, rating: 1 | -1) => {
    const feedbackKey = `${version.id}-${format}`;
    setFeedbackLoading(feedbackKey);
    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                campaignId: campaign.id,
                contentVersionId: version.id,
                contentFormat: format,
                rating: rating,
            }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to submit feedback.');
        }

        setSubmittedFeedback(prev => ({ ...prev, [feedbackKey]: rating === 1 ? 'up' : 'down' }));
        toast({ title: "Feedback Submitted!", description: "Thank you for helping us improve." });
        await awardXP(5, "providing feedback");

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        // If the error is a conflict (already submitted), just update the UI state silently
        if (errorMessage.includes('already submitted')) {
            setSubmittedFeedback(prev => ({...prev, [feedbackKey]: 'down' })); // Assume it exists
        } else {
            toast({ title: "Feedback Error", description: errorMessage, variant: "destructive" });
        }
    } finally {
        setFeedbackLoading(null);
    }
  };


  const formatTitle = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <Button onClick={onBack} variant="outline" size="sm">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Campaign List
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-2xl">{campaign.title}</CardTitle>
              <CardDescription>
                Status: <Badge variant="secondary">{campaign.status}</Badge> | Last Updated: {format(new Date(campaign.updatedAt), "MMM d, yyyy, p")}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
            <p><span className="font-semibold">Brief:</span> {campaign.brief}</p>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tools & Actions */}
        <div className="lg:col-span-1 space-y-6">
           <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><FlaskConical className="h-5 w-5 text-primary"/> Brand Profile</CardTitle>
                <CardDescription>The analyzed brand identity for this campaign.</CardDescription>
            </CardHeader>
            <CardContent>
                 {!campaign.brandProfile ? (
                    <div className="text-center py-4">
                        <p className="text-muted-foreground mb-4 text-sm">No brand profile generated yet.</p>
                        <Button onClick={() => setIsAnalyzeDialogOpen(true)} size="sm">
                            <Beaker className="mr-2 h-4 w-4" /> Analyze Brand Profile
                        </Button>
                    </div>
                 ) : (
                    <div className="text-sm space-y-2">
                        <p><strong>Tone:</strong> <Badge variant="outline">{campaign.brandProfile.voiceProfile.tone}</Badge></p>
                        <p><strong>Values:</strong> {campaign.brandProfile.voiceProfile.values.join(', ')}</p>
                    </div>
                 )}
            </CardContent>
           </Card>

           <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Bot className="h-5 w-5 text-primary"/> Creative War Room</CardTitle>
                <CardDescription>AI agents collaborate on the strategy.</CardDescription>
            </CardHeader>
            <CardContent>
                {campaign.agentDebates.length === 0 ? (
                    <div className="text-center py-4">
                         <p className="text-muted-foreground mb-4 text-sm">The debate has not started.</p>
                         <Button onClick={handleRunWarRoom} disabled={isDebating} size="sm">
                             {isDebating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <MessageSquare className="mr-2 h-4 w-4" />}
                             {isDebating ? 'Debating...' : 'Start Strategy Session'}
                         </Button>
                    </div>
                ) : (
                    <AgentDebateDisplay debates={campaign.agentDebates} />
                )}
            </CardContent>
           </Card>

           <Card>
             <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-primary"/> Content Calendar</CardTitle>
                <CardDescription>Generate a strategic content schedule.</CardDescription>
              </CardHeader>
              <CardContent>
                {(!campaign.scheduledPosts || campaign.scheduledPosts.length === 0) ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4 text-sm">No content schedule has been generated yet.</p>
                    <Button onClick={handleGenerateSchedule} disabled={isGeneratingSchedule} size="sm">
                      {isGeneratingSchedule ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                      {isGeneratingSchedule ? 'Generating...' : 'Generate Schedule'}
                    </Button>
                  </div>
                ) : (
                  <ContentCalendarDisplay schedule={campaign.scheduledPosts} />
                )}
              </CardContent>
           </Card>
        </div>

        {/* Right Column: Content Versions */}
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><PencilRuler className="h-5 w-5 text-primary"/> Content Versions</CardTitle>
                    <CardDescription>Generated content based on the campaign brief and strategy debate. Use the tools to refine it.</CardDescription>
                </CardHeader>
                <CardContent>
                    {campaign.contentVersions.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground mb-4">No content has been generated yet.</p>
                            <Button onClick={handleGenerateInitialContent} disabled={isGeneratingContent}>
                                {isGeneratingContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                                {isGeneratingContent ? "Generating..." : "Generate Initial Content"}
                            </Button>
                        </div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full" defaultValue={`v-${campaign.contentVersions[campaign.contentVersions.length - 1].versionNumber}`}>
                            {campaign.contentVersions.map((version) => (
                                <AccordionItem value={`v-${version.versionNumber}`} key={version.id}>
                                    <AccordionTrigger>Version {version.versionNumber} by {version.actorName}</AccordionTrigger>
                                    <AccordionContent className="space-y-4">
                                        <p className="text-sm text-muted-foreground">{version.changeSummary}</p>
                                        <Separator/>
                                        <div className="space-y-3">
                                            {Object.entries(version.multiFormatContentSnapshot).map(([format, text]) => 
                                                text ? (
                                                    <div key={format} className="p-3 border rounded-md bg-muted/50">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h4 className="font-semibold text-sm capitalize">{formatTitle(format)}</h4>
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7"
                                                                    onClick={() => handleFeedbackSubmit(version, format, 1)}
                                                                    disabled={feedbackLoading === `${version.id}-${format}` || !!submittedFeedback[`${version.id}-${format}`]}
                                                                    title="Good content"
                                                                >
                                                                    <ThumbsUp className={`h-4 w-4 ${submittedFeedback[`${version.id}-${format}`] === 'up' ? 'text-primary fill-primary' : ''}`} />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7"
                                                                    onClick={() => handleFeedbackSubmit(version, format, -1)}
                                                                    disabled={feedbackLoading === `${version.id}-${format}` || !!submittedFeedback[`${version.id}-${format}`]}
                                                                    title="Needs improvement"
                                                                >
                                                                    <ThumbsDown className={`h-4 w-4 ${submittedFeedback[`${version.id}-${format}`] === 'down' ? 'text-destructive fill-destructive' : ''}`} />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <pre className="whitespace-pre-wrap text-xs p-2 border rounded bg-background max-h-40 overflow-y-auto">{text}</pre>
                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                            <Button size="sm" variant="outline" onClick={() => handleOpenReviseDialog(text, format, version)}>
                                                                <Sparkles className="mr-1 h-3 w-3"/> Revise
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => handleOpenAuditDialog(text)} disabled={!campaign.brandProfile}>
                                                                <SearchCheck className="mr-1 h-3 w-3"/> Audit
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => handleOpenTranslateDialog(text, format, version)}>
                                                                <Languages className="mr-1 h-3 w-3"/> Translate
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => handleOpenOptimizeDialog(text, format, version)}>
                                                                <Zap className="mr-1 h-3 w-3"/> Optimize
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : null
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
      

      {/* Dialogs */}
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>
              Modify your campaign's core details below.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Title</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="brief"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Creative Brief</FormLabel>
                    <FormControl><Textarea {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience (Optional)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desired Tone (Optional)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog open={isAnalyzeDialogOpen} onOpenChange={setIsAnalyzeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Analyze Brand Profile</DialogTitle>
              <DialogDescription>
                Paste in reference material (e.g., website copy, mission statement) to create a brand profile.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="reference-text">Reference Text</Label>
              <Textarea
                id="reference-text"
                value={referenceText}
                onChange={(e) => setReferenceText(e.target.value)}
                placeholder="Paste content here..."
                rows={10}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleAnalyzeBrand} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isPending ? 'Analyzing...' : 'Analyze and Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
      
      <Dialog open={isReviseDialogOpen} onOpenChange={setIsReviseDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Revise Content</DialogTitle>
                <DialogDescription>Refine the content to better match your needs. The original is on the left, the revision will appear on the right.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                    <Label>Original Content ({contentToRevise?.contentType})</Label>
                    <Textarea readOnly value={contentToRevise?.originalContent} rows={8} className="text-xs"/>
                </div>
                 <div className="space-y-2">
                    <Label>Revised Content</Label>
                    <Textarea readOnly value={revisedContent ?? "AI revision will appear here..."} rows={8} className="text-xs"/>
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="revision-instructions">Revision Instructions</Label>
                <Textarea id="revision-instructions" value={revisionInstructions} onChange={(e) => setRevisionInstructions(e.target.value)} placeholder="e.g., Make this more persuasive for Gen Z. Add more technical details. Shorten it to two sentences."/>
            </div>
            <DialogFooter>
                 {revisedContent && contentToRevise && (
                    <Button onClick={() => handleSaveAsNewVersion(revisedContent, contentToRevise.contentType, contentToRevise.version, `Revised "${contentToRevise.contentType}" with new instructions.`, "User Revision")} disabled={isPending} variant="secondary">
                        <Save className="mr-2 h-4 w-4" /> Save as New Version
                    </Button>
                )}
                <Button onClick={handleReviseContent} disabled={isPending}>
                    {isPending && !revisedContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                    {isPending && !revisedContent ? 'Revising...' : 'Run Revision'}
                </Button>
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAuditDialogOpen} onOpenChange={setIsAuditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Brand Alignment Audit</DialogTitle>
              <DialogDescription>
                Checking how well this piece of content aligns with the campaign's Brand Profile.
              </DialogDescription>
            </DialogHeader>
             <div className="space-y-2 py-4">
                <Label>Content to Audit</Label>
                <Textarea readOnly value={contentToAudit} rows={6} className="text-xs"/>
            </div>
            {auditResult && (
                <div className="space-y-4">
                    <Separator/>
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Alignment Score</p>
                        <p className="text-4xl font-bold text-primary">{auditResult.alignmentScore}<span className="text-2xl text-muted-foreground">/100</span></p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Justification</h4>
                        <p className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/50">{auditResult.justification}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Suggestions for Improvement</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 p-2 border rounded-md bg-muted/50">
                            {auditResult.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                </div>
            )}
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
              <Button onClick={handleRunAudit} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchCheck className="mr-2 h-4 w-4" />}
                {auditResult ? 'Re-run Audit' : 'Run Audit'}
              </Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
      
      <Dialog open={isTranslateDialogOpen} onOpenChange={setIsTranslateDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Translate Content</DialogTitle>
                <DialogDescription>Translate content to a different language. The original is on the left, the translation will appear on the right.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                    <Label>Original Content ({contentToTranslate?.contentType})</Label>
                    <Textarea readOnly value={contentToTranslate?.originalContent} rows={8} className="text-xs"/>
                </div>
                 <div className="space-y-2">
                    <Label>Translated Content</Label>
                    <Textarea readOnly value={translatedContent ?? "AI translation will appear here..."} rows={8} className="text-xs"/>
                </div>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="target-language">Target Language</Label>
                    <Input id="target-language" value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} placeholder="e.g., Spanish, Japanese, Bengali"/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tone-description">Tone Description (Optional)</Label>
                    <Input id="tone-description" value={toneDescription} onChange={(e) => setToneDescription(e.target.value)} placeholder="e.g., Formal and respectful"/>
                </div>
            </div>
            <DialogFooter>
                {translatedContent && contentToTranslate && (
                    <Button onClick={() => handleSaveAsNewVersion(translatedContent, contentToTranslate.contentType, contentToTranslate.version, `Translated "${contentToTranslate.contentType}" to ${targetLanguage}.`, "Localization AI")} disabled={isPending} variant="secondary">
                        <Save className="mr-2 h-4 w-4" /> Save as New Version
                    </Button>
                )}
                <Button onClick={handleTranslateContent} disabled={isPending}>
                    {isPending && !translatedContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Languages className="mr-2 h-4 w-4"/>}
                    {isPending && !translatedContent ? 'Translating...' : 'Run Translation'}
                </Button>
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOptimizeDialogOpen} onOpenChange={setIsOptimizeDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Optimize Content Performance</DialogTitle>
                <DialogDescription>
                    Select a goal and the AI will analyze and rewrite the content to improve its performance.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label>Original Content ({contentToOptimize?.contentType})</Label>
                        <Textarea readOnly value={contentToOptimize?.originalContent} rows={8} className="text-xs mt-1"/>
                    </div>
                    <div>
                        <Label>Optimized Content</Label>
                        <Textarea readOnly value={optimizationResult?.optimizedContent ?? "AI optimization will appear here..."} rows={8} className="text-xs mt-1"/>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="optimization-goal">Optimization Goal</Label>
                     <Select value={optimizationGoal} onValueChange={setOptimizationGoal}>
                        <SelectTrigger id="optimization-goal">
                            <SelectValue placeholder="Select a goal..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Improve user engagement">Improve User Engagement</SelectItem>
                            <SelectItem value="Increase click-through rate">Increase Click-Through Rate (CTR)</SelectItem>
                            <SelectItem value="Boost conversion rate">Boost Conversion Rate</SelectItem>
                            <SelectItem value="Enhance readability">Enhance Readability</SelectItem>
                            <SelectItem value="Strengthen call-to-action">Strengthen Call-to-Action (CTA)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                {isPending && !optimizationResult && (
                  <div className="flex justify-center items-center p-4">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>Optimizing...</span>
                  </div>
                )}

                {optimizationResult && !isPending && (
                    <div className="space-y-4 pt-4 border-t">
                       <h4 className="font-semibold text-md">Optimization Analysis</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                             <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Original Score</CardDescription>
                                    <CardTitle className="text-4xl text-primary">{optimizationResult.predictedPerformance.score}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">{optimizationResult.predictedPerformance.justification}</p>
                                </CardContent>
                            </Card>
                            <Card className="md:col-span-2">
                                <CardHeader className="pb-2">
                                    <CardDescription>What Changed & Why</CardDescription>
                                </CardHeader>
                                 <CardContent>
                                    <p className="text-sm text-muted-foreground text-left">{optimizationResult.explanation}</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
            <DialogFooter>
                 {optimizationResult && contentToOptimize && (
                    <Button onClick={() => handleSaveAsNewVersion(optimizationResult.optimizedContent, contentToOptimize.contentType, contentToOptimize.version, `Optimized "${contentToOptimize.contentType}" for ${optimizationGoal}.`, "Performance AI")} disabled={isPending} variant="secondary">
                        <Save className="mr-2 h-4 w-4" /> Save as New Version
                    </Button>
                )}
                <Button onClick={handleOptimizeContent} disabled={isPending}>
                    {isPending && !optimizationResult ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4"/>}
                    {optimizationResult ? 'Re-run Optimization' : 'Run Optimization'}
                </Button>
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
