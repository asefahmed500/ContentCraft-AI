
"use client";

import { useState, useTransition } from 'react';
import type { ContentVersion } from '@/types/content';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Save } from 'lucide-react';

interface ReviseToolDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  campaignId: string;
  contentToRevise: { version: ContentVersion; originalContent: string; contentType: string };
  onSave: (newContent: string, format: string, sourceVersion: ContentVersion, changeSummary: string, actorName: string) => Promise<void>;
  awardXP: (xp: number, action: string) => Promise<void>;
}

export function ReviseToolDialog({ isOpen, onOpenChange, campaignId, contentToRevise, onSave, awardXP }: ReviseToolDialogProps) {
  const { toast } = useToast();
  const [isProcessing, startTransition] = useTransition();
  const [revisionInstructions, setRevisionInstructions] = useState('');
  const [revisedContent, setRevisedContent] = useState<string | null>(null);

  const handleReviseContent = () => {
    if (!revisionInstructions.trim()) {
        toast({ title: "Input Required", description: "Please provide revision instructions.", variant: "destructive" });
        return;
    }
    setRevisedContent(null);
    startTransition(async () => {
        try {
            const response = await fetch('/api/content/revise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalContent: contentToRevise.originalContent,
                    contentType: contentToRevise.contentType,
                    revisionInstructions,
                    campaignId: campaignId,
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

  const handleSave = () => {
    if (revisedContent) {
      onSave(
        revisedContent,
        contentToRevise.contentType,
        contentToRevise.version,
        `Revised "${contentToRevise.contentType}" with new instructions.`,
        'User Revision'
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                    <Button onClick={handleSave} disabled={isProcessing} variant="secondary">
                        <Save className="mr-2 h-4 w-4" /> Save as New Version
                    </Button>
                )}
                <Button onClick={handleReviseContent} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                    {isProcessing ? 'Revising...' : 'Run Revision'}
                </Button>
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
