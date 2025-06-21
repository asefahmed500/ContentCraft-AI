
"use client";

import type { Campaign, ContentVersion } from '@/types/content';
import { useState, useTransition, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, ArrowLeft, Save } from 'lucide-react';
import { analyzeBrandProfile } from '@/ai/flows/brand-learning';
import { useSession } from 'next-auth/react';

import { CampaignHeader } from './CampaignHeader';
import { CampaignTools } from './CampaignTools';
import { ContentVersionsDisplay } from './ContentVersionsDisplay';
import { ReviseToolDialog } from './dialogs/ReviseToolDialog';
import { AuditToolDialog } from './dialogs/AuditToolDialog';
import { TranslateToolDialog } from './dialogs/TranslateToolDialog';
import { OptimizeToolDialog } from './dialogs/OptimizeToolDialog';

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

const textToDataUri = (text: string) => {
    const base64 = btoa(unescape(encodeURIComponent(text)));
    return `data:text/plain;base64,${base64}`;
}

export type SubmittedFeedback = {
  [key: string]: 'up' | 'down'; // key is "versionId-format"
};

export function CampaignDetailClient({ initialCampaign, onBack, onCampaignUpdate }: CampaignDetailClientProps) {
  const { toast } = useToast();
  const { data: session, update: updateSession } = useSession();
  const [campaign, setCampaign] = useState<Campaign>(initialCampaign);
  const [isPending, startTransition] = useTransition();

  // Main dialog states
  const [isAnalyzeDialogOpen, setIsAnalyzeDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Loading states
  const [isDebating, setIsDebating] = useState(false);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  // Tool Dialog states and data
  const [activeTool, setActiveTool] = useState<'revise' | 'audit' | 'translate' | 'optimize' | null>(null);
  const [toolData, setToolData] = useState<{ version: ContentVersion, originalContent: string, contentType: string } | null>(null);

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
            setActiveTool(null);
            setToolData(null);
        }
    });
  };
  
  const openToolDialog = (tool: 'revise' | 'audit' | 'translate' | 'optimize', version: ContentVersion, originalContent: string, contentType: string) => {
    setToolData({ version, originalContent, contentType });
    setActiveTool(tool);
  };


  return (
    <div className="space-y-6">
      <Button onClick={onBack} variant="outline" size="sm">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Campaign List
      </Button>

      <CampaignHeader campaign={campaign} onEditClick={() => setIsEditDialogOpen(true)} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CampaignTools
            campaign={campaign}
            isDebating={isDebating}
            isGeneratingSchedule={isGeneratingSchedule}
            onRunWarRoom={handleRunWarRoom}
            onGenerateSchedule={handleGenerateSchedule}
            onAnalyzeBrandClick={() => setIsAnalyzeDialogOpen(true)}
        />
        <div className="lg:col-span-2">
            <ContentVersionsDisplay
                campaign={campaign}
                isGeneratingContent={isGeneratingContent}
                submittedFeedback={submittedFeedback}
                onGenerateInitialContent={handleGenerateInitialContent}
                onOpenToolDialog={openToolDialog}
                onFeedbackSubmit={async (version, format, rating) => {
                    try {
                        const response = await fetch('/api/feedback', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ campaignId: campaign.id, contentVersionId: version.id, contentFormat: format, rating }),
                        });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.error || 'Failed to submit feedback.');
                        
                        setSubmittedFeedback(prev => ({ ...prev, [`${version.id}-${format}`]: rating === 1 ? 'up' : 'down' }));
                        toast({ title: "Feedback Submitted!", description: "Thank you for helping us improve." });
                        await awardXP(5, "providing feedback");
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : 'An unknown error occurred.';
                        toast({ title: "Feedback Error", description: msg, variant: "destructive" });
                    }
                }}
            />
        </div>
      </div>
      
      {/* DIALOGS */}
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
      
      {toolData && (
        <>
          <ReviseToolDialog
            isOpen={activeTool === 'revise'}
            onOpenChange={() => setActiveTool(null)}
            campaignId={campaign.id}
            contentToRevise={toolData}
            onSave={handleSaveAsNewVersion}
            awardXP={awardXP}
          />
          <AuditToolDialog
            isOpen={activeTool === 'audit'}
            onOpenChange={() => setActiveTool(null)}
            campaignId={campaign.id}
            contentToAudit={toolData.originalContent}
            awardXP={awardXP}
          />
          <TranslateToolDialog
            isOpen={activeTool === 'translate'}
            onOpenChange={() => setActiveTool(null)}
            contentToTranslate={toolData}
            onSave={handleSaveAsNewVersion}
            awardXP={awardXP}
          />
          <OptimizeToolDialog
            isOpen={activeTool === 'optimize'}
            onOpenChange={() => setActiveTool(null)}
            campaignId={campaign.id}
            contentToOptimize={toolData}
            onSave={handleSaveAsNewVersion}
            awardXP={awardXP}
          />
        </>
      )}
    </div>
  );
}
