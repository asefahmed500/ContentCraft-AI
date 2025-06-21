
"use client";

import type { Campaign, ContentVersion, AgentInteraction, MultiFormatContent, ScheduledPost } from '@/types/content';
import type { BrandProfile } from '@/types/brand';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Beaker, FileText, Sparkles, ArrowLeft, Bot, MessageSquare, Microscope, FlaskConical, PencilRuler, SearchCheck, CheckCircle2, CalendarDays, Languages, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { analyzeBrandProfile } from '@/ai/flows/brand-learning';
import { AgentDebateDisplay } from '@/components/AgentDebateDisplay';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { ContentCalendarDisplay } from './ContentCalendarDisplay';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface CampaignDetailClientProps {
  initialCampaign: Campaign;
  onBack: () => void;
  onCampaignUpdate: (updatedCampaign: Campaign) => void;
}

// Helper to convert base64 to data URI
const textToDataUri = (text: string) => {
    const base64 = btoa(unescape(encodeURIComponent(text)));
    return `data:text/plain;base64,${base64}`;
}

export function CampaignDetailClient({ initialCampaign, onBack, onCampaignUpdate }: CampaignDetailClientProps) {
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign>(initialCampaign);
  const [isPending, startTransition] = useTransition();

  // Brand Analysis State
  const [isAnalyzeDialogOpen, setIsAnalyzeDialogOpen] = useState(false);
  const [referenceText, setReferenceText] = useState('');

  // War Room State
  const [isDebating, setIsDebating] = useState(false);

  // Content Calendar State
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  
  // Revise Content State
  const [isReviseDialogOpen, setIsReviseDialogOpen] = useState(false);
  const [contentToRevise, setContentToRevise] = useState<{ originalContent: string; contentType: string } | null>(null);
  const [revisionInstructions, setRevisionInstructions] = useState('');
  const [revisedContent, setRevisedContent] = useState<string | null>(null);

  // Brand Audit State
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [auditResult, setAuditResult] = useState<{ alignmentScore: number; justification: string; suggestions: string[] } | null>(null);
  const [contentToAudit, setContentToAudit] = useState<string>('');
  
  // Translate Content State
  const [isTranslateDialogOpen, setIsTranslateDialogOpen] = useState(false);
  const [contentToTranslate, setContentToTranslate] = useState<{ originalContent: string; contentType: string } | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [toneDescription, setToneDescription] = useState('');
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);

  // Optimize Content State
  const [isOptimizeDialogOpen, setIsOptimizeDialogOpen] = useState(false);
  const [contentToOptimize, setContentToOptimize] = useState<{ originalContent: string; contentType: string } | null>(null);
  const [optimizationGoal, setOptimizationGoal] = useState('Improve user engagement');
  const [optimizationResult, setOptimizationResult] = useState<{ predictedPerformance: { score: number, justification: string }, optimizedContent: string, explanation: string } | null>(null);


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
        setIsAnalyzeDialogOpen(false);
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
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to run the war room.');
        }

        // The API now saves the debate log, so we just need to refresh the campaign data
        const updatedCampaign = await handleUpdateCampaign({}); // Send empty update to just refetch
        if (updatedCampaign) {
          toast({ title: "War Room Concluded!", description: "The strategy session is complete and has been saved." });
        }
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

      // The API returns the full updated campaign, so we can just set it
      const newlyUpdatedCampaign = result as Campaign;
      setCampaign(newlyUpdatedCampaign);
      onCampaignUpdate(newlyUpdatedCampaign);

      toast({ title: "Content Schedule Generated!", description: "Your 7-day content plan is ready." });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Schedule Generation Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  const handleOpenReviseDialog = (originalContent: string, contentType: string) => {
    setContentToRevise({ originalContent, contentType });
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
                    ...contentToRevise,
                    revisionInstructions,
                    campaignId: campaign.id,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to revise content.');
            setRevisedContent(result.revisedContent);
            toast({ title: "Content Revised", description: "The AI has provided a revision below." });
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
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        toast({ title: "Audit Failed", description: errorMessage, variant: "destructive" });
      }
    });
  };
  
  const handleOpenTranslateDialog = (originalContent: string, contentType: string) => {
    setContentToTranslate({ originalContent, contentType });
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
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            toast({ title: "Translation Failed", description: errorMessage, variant: "destructive" });
        }
    });
  };

  const handleOpenOptimizeDialog = (originalContent: string, contentType: string) => {
    setContentToOptimize({ originalContent, contentType });
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
                    ...contentToOptimize,
                    optimizationGoal,
                    campaignId: campaign.id,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to optimize content.');
            setOptimizationResult(result);
            toast({ title: "Optimization Complete", description: "The AI has provided an optimized version below." });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            toast({ title: "Optimization Failed", description: errorMessage, variant: "destructive" });
        }
    });
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
          <CardTitle className="font-headline text-2xl">{campaign.title}</CardTitle>
          <CardDescription>
            Status: <Badge variant="secondary">{campaign.status}</Badge> | Last Updated: {format(new Date(campaign.updatedAt), "MMM d, yyyy, p")}
          </CardDescription>
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
                            <Button disabled>Generate Content (Coming Soon)</Button>
                        </div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full">
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
                                                        <h4 className="font-semibold text-sm capitalize mb-2">{formatTitle(format)}</h4>
                                                        <pre className="whitespace-pre-wrap text-xs p-2 border rounded bg-background max-h-40 overflow-y-auto">{text}</pre>
                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                            <Button size="xs" variant="outline" onClick={() => handleOpenReviseDialog(text, format)}>
                                                                <Sparkles className="mr-1 h-3 w-3"/> Revise
                                                            </Button>
                                                            <Button size="xs" variant="outline" onClick={() => handleOpenAuditDialog(text)} disabled={!campaign.brandProfile}>
                                                                <SearchCheck className="mr-1 h-3 w-3"/> Audit
                                                            </Button>
                                                            <Button size="xs" variant="outline" onClick={() => handleOpenTranslateDialog(text, format)}>
                                                                <Languages className="mr-1 h-3 w-3"/> Translate
                                                            </Button>
                                                            <Button size="xs" variant="outline" onClick={() => handleOpenOptimizeDialog(text, format)}>
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
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                <Button onClick={handleReviseContent} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                    {isPending ? 'Revising...' : 'Run Revision'}
                </Button>
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
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                <Button onClick={handleTranslateContent} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Languages className="mr-2 h-4 w-4"/>}
                    {isPending ? 'Translating...' : 'Run Translation'}
                </Button>
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
                
                {isPending && (
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
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                <Button onClick={handleOptimizeContent} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4"/>}
                    {optimizationResult ? 'Re-run Optimization' : 'Run Optimization'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
