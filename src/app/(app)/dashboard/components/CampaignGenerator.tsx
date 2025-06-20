"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // Added missing import
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Lightbulb } from 'lucide-react';

interface CampaignGeneratorProps {
  onGenerateCampaign: (brief: string, brandVoice?: string) => Promise<void>;
  isGenerating: boolean;
}

export function CampaignGenerator({ onGenerateCampaign, isGenerating }: CampaignGeneratorProps) {
  const [brief, setBrief] = useState('');
  const [brandVoice, setBrandVoice] = useState(''); // Optional brand voice input
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!brief.trim()) {
      toast({ title: "Brief is empty", description: "Please provide a campaign brief.", variant: "destructive" });
      return;
    }
    await onGenerateCampaign(brief, brandVoice.trim() || undefined);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-primary" />
          Create New Campaign
        </CardTitle>
        <CardDescription>Describe your campaign goals, target audience, and key messages. Our AI agents will take it from there.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="campaign-brief" className="text-base">Campaign Brief</Label>
          <Textarea
            id="campaign-brief"
            placeholder="e.g., Launch campaign for eco-friendly skincare line targeting Gen Z..."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={5}
            className="text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand-voice" className="text-base">Brand Voice (Optional)</Label>
          <Input
            id="brand-voice"
            placeholder="e.g., Playful and witty, or professional and informative"
            value={brandVoice}
            onChange={(e) => setBrandVoice(e.target.value)}
            className="text-base"
          />
          <p className="text-xs text-muted-foreground">
            If a Brand DNA analysis was performed, its voice profile will be used by default. You can override it here.
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={isGenerating} size="lg" className="w-full">
          {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Wand2 className="mr-2 h-5 w-5" /> Generate Campaign</>}
        </Button>
      </CardContent>
    </Card>
  );
}
