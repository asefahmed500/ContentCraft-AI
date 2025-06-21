
"use client";

import { useState, useTransition } from 'react';
import type { ContentVersion } from '@/types/content';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Languages, Save } from 'lucide-react';

interface TranslateToolDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contentToTranslate: { version: ContentVersion; originalContent: string; contentType: string };
  onSave: (newContent: string, format: string, sourceVersion: ContentVersion, changeSummary: string, actorName: string) => Promise<void>;
  awardXP: (xp: number, action: string) => Promise<void>;
}

export function TranslateToolDialog({ isOpen, onOpenChange, contentToTranslate, onSave, awardXP }: TranslateToolDialogProps) {
  const { toast } = useToast();
  const [isProcessing, startTransition] = useTransition();
  const [targetLanguage, setTargetLanguage] = useState('');
  const [toneDescription, setToneDescription] = useState('');
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);

  const handleTranslateContent = () => {
    if (!targetLanguage.trim()) {
        toast({ title: "Input Required", description: "Please enter a target language.", variant: "destructive" });
        return;
    }
    setTranslatedContent(null);
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

  const handleSave = () => {
    if (translatedContent) {
      onSave(
        translatedContent,
        contentToTranslate.contentType,
        contentToTranslate.version,
        `Translated "${contentToTranslate.contentType}" to ${targetLanguage}.`,
        'Localization Agent'
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Translate Content</DialogTitle>
          <DialogDescription>Translate content into different languages while trying to preserve tone and nuance.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Original Content</Label>
            <Textarea readOnly value={contentToTranslate?.originalContent} rows={8} className="text-xs" />
          </div>
          <div className="space-y-2">
            <Label>Translated Content</Label>
            <Textarea readOnly value={translatedContent ?? "Translation will appear here..."} rows={8} className="text-xs" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="target-language">Target Language</Label>
            <Input id="target-language" value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} placeholder="e.g., Spanish, Japanese" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tone-description">Tone (Optional)</Label>
            <Input id="tone-description" value={toneDescription} onChange={(e) => setToneDescription(e.target.value)} placeholder="e.g., Formal and respectful" />
          </div>
        </div>
        <DialogFooter>
          {translatedContent && (
            <Button onClick={handleSave} disabled={isProcessing} variant="secondary">
              <Save className="mr-2 h-4 w-4" /> Save as New Version
            </Button>
          )}
          <Button onClick={handleTranslateContent} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
            {isProcessing ? 'Translating...' : 'Translate'}
          </Button>
          <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
