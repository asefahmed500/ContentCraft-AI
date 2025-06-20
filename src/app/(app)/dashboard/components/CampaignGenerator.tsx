"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Lightbulb, Users, Target, Palette, FileUp } from 'lucide-react';

interface CampaignGeneratorProps {
  onGenerateCampaign: (
    brief: string, 
    brandVoice?: string, 
    targetAudience?: string,
    tone?: string,
    contentGoals?: string[]
  ) => Promise<void>;
  isGenerating: boolean;
}

const availableTones = ["Formal", "Informal", "Playful", "Serious", "Witty", "Empathetic", "Authoritative"];
const availableGoals = ["Brand Awareness", "Lead Generation", "Sales Conversion", "Engagement", "Education", "Community Building"];


export function CampaignGenerator({ onGenerateCampaign, isGenerating }: CampaignGeneratorProps) {
  const [brief, setBrief] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [tone, setTone] = useState('');
  const [contentGoals, setContentGoals] = useState<string[]>([]);
  // const [referenceFile, setReferenceFile] = useState<File | null>(null); // For future reference material upload

  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!brief.trim()) {
      toast({ title: "Brief is empty", description: "Please provide a campaign brief.", variant: "destructive" });
      return;
    }
    await onGenerateCampaign(
      brief, 
      brandVoice.trim() || undefined,
      targetAudience.trim() || undefined,
      tone || undefined,
      contentGoals.length > 0 ? contentGoals : undefined
    );
  };

  // const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   if (event.target.files && event.target.files[0]) {
  //     setReferenceFile(event.target.files[0]);
  //   }
  // };

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
          <Label htmlFor="campaign-brief" className="text-base">Campaign Brief / Product Description</Label>
          <Textarea
            id="campaign-brief"
            placeholder="e.g., Launch campaign for eco-friendly skincare line..."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={5}
            className="text-base"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="target-audience" className="text-base flex items-center gap-1"><Users className="h-4 w-4"/>Target Audience</Label>
            <Input
              id="target-audience"
              placeholder="e.g., Gen Z, Millennial Moms, B2B Tech"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tone" className="text-base flex items-center gap-1"><Palette className="h-4 w-4"/>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger id="tone" className="text-base">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                {availableTones.map(t => <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="content-goals" className="text-base flex items-center gap-1"><Target className="h-4 w-4"/>Content Goals</Label>
           <Select onValueChange={(value) => {
              const newGoals = contentGoals.includes(value) ? contentGoals.filter(g => g !== value) : [...contentGoals, value];
              if (newGoals.length <= 3) setContentGoals(newGoals); // Limit to 3 goals for example
           }}>
            <SelectTrigger id="content-goals" className="text-base h-auto min-h-10 py-2">
                <SelectValue placeholder="Select up to 3 goals">
                  {contentGoals.length > 0 ? contentGoals.join(', ') : "Select up to 3 goals"}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {availableGoals.map(goal => (
                    <SelectItem key={goal} value={goal} disabled={contentGoals.length >=3 && !contentGoals.includes(goal)}>
                        {goal} {contentGoals.includes(goal) ? ' (Selected)' : ''}
                    </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Select up to 3 primary goals for this campaign.</p>
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

        {/* Placeholder for reference material upload
        <div className="space-y-2">
          <Label htmlFor="reference-material" className="text-base flex items-center gap-1"><FileUp className="h-4 w-4"/>Reference Material (Optional)</Label>
          <Input id="reference-material" type="file" onChange={handleFileChange} accept=".pdf,.txt,.md,.doc,.docx" />
          {referenceFile && <p className="text-sm text-muted-foreground">Selected file: {referenceFile.name}</p>}
          <p className="text-xs text-muted-foreground">Upload PDFs, text files, or documents for AI agents to reference.</p>
        </div>
        */}

        <Button onClick={handleSubmit} disabled={isGenerating} size="lg" className="w-full">
          {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Wand2 className="mr-2 h-5 w-5" /> Generate Campaign</>}
        </Button>
      </CardContent>
    </Card>
  );
}
