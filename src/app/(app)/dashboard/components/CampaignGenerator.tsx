"use client";

import type { FormEvent} from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Lightbulb, Users, Target, Palette, FileUp, Save } from 'lucide-react';
import type { Campaign } from '@/types/content'; // Assuming Campaign type includes all necessary fields

interface CampaignGeneratorProps {
  onCampaignCreated: (newCampaign: Campaign) => void; // Callback after a new campaign is saved
  onGenerateContentForCampaign: (campaign: Campaign, brandVoice?: string) => Promise<void>; // Callback to start AI processing
  isGenerating: boolean; // True if AI is currently processing (debating/generating content)
  selectedCampaignForEdit?: Campaign | null; // Optional: for pre-filling the form
}

const availableTones = ["Formal", "Informal", "Playful", "Serious", "Witty", "Empathetic", "Authoritative", "Casual", "Professional", "Friendly"];
const availableGoals = ["Brand Awareness", "Lead Generation", "Sales Conversion", "Engagement", "Education", "Community Building", "Website Traffic", "Product Launch"];


export function CampaignGenerator({ 
    onCampaignCreated, 
    onGenerateContentForCampaign, 
    isGenerating,
    selectedCampaignForEdit 
}: CampaignGeneratorProps) {
  const [brief, setBrief] = useState('');
  const [brandVoice, setBrandVoice] = useState(''); // This might be an override or input if no BrandDNA
  const [targetAudience, setTargetAudience] = useState('');
  const [tone, setTone] = useState('');
  const [contentGoals, setContentGoals] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false); // For "Save Draft" or "Create Campaign" DB operation

  const { toast } = useToast();

  useEffect(() => {
    if (selectedCampaignForEdit) {
      setBrief(selectedCampaignForEdit.brief || '');
      setTargetAudience(selectedCampaignForEdit.targetAudience || '');
      setTone(selectedCampaignForEdit.tone || '');
      setContentGoals(selectedCampaignForEdit.contentGoals || []);
      // Assuming brandVoice might be part of campaign or fetched separately
    } else {
      // Reset form for new campaign
      setBrief('');
      setTargetAudience('');
      setTone('');
      setContentGoals([]);
      setBrandVoice('');
    }
  }, [selectedCampaignForEdit]);


  const handleSaveCampaign = async (andStartGeneration: boolean = false) => {
    if (!brief.trim()) {
      toast({ title: "Brief is empty", description: "Please provide a campaign brief.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    const campaignData = {
      brief,
      targetAudience: targetAudience.trim() || undefined,
      tone: tone || undefined,
      contentGoals: contentGoals.length > 0 ? contentGoals : undefined,
      // brandVoice will be handled by the parent, possibly fetched from BrandDNA
      // id: selectedCampaignForEdit?.id // If editing, pass ID for update
    };

    try {
      // If selectedCampaignForEdit, it's an update (PUT), else it's a create (POST)
      // For simplicity, this example focuses on creation. Update logic would be similar with a PUT request.
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save campaign');
      }
      const newCampaign: Campaign = await response.json();
      
      toast({ title: "Campaign Saved!", description: "Your campaign brief has been saved." });
      onCampaignCreated(newCampaign); // Notify parent about the new/updated campaign

      if (andStartGeneration) {
        await onGenerateContentForCampaign(newCampaign, brandVoice.trim() || undefined);
      } else {
        // Reset form if not starting generation immediately, or clear for next new one
        // setBrief(''); setTargetAudience(''); setTone(''); setContentGoals([]); setBrandVoice('');
      }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({ title: "Failed to Save Campaign", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-primary" />
          {selectedCampaignForEdit ? "Edit Campaign Brief" : "Create New Campaign"}
        </CardTitle>
        <CardDescription>
            {selectedCampaignForEdit 
                ? "Update the details for your campaign. Agents will use this information."
                : "Describe your campaign goals, target audience, and key messages. Our AI agents will take it from there."
            }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="campaign-brief" className="text-base">Campaign Brief / Product Description*</Label>
          <Textarea
            id="campaign-brief"
            placeholder="e.g., Launch campaign for new eco-friendly skincare line targeting young adults..."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={5}
            className="text-base"
            required
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
                <SelectValue placeholder="Select tone (e.g., Playful)" />
              </SelectTrigger>
              <SelectContent>
                {availableTones.map(t => <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="content-goals" className="text-base flex items-center gap-1"><Target className="h-4 w-4"/>Content Goals (Max 3)</Label>
           <Select onValueChange={(value) => {
              const newGoals = contentGoals.includes(value) ? contentGoals.filter(g => g !== value) : [...contentGoals, value];
              if (newGoals.length <= 3) setContentGoals(newGoals);
              else toast({ title: "Goal Limit Reached", description: "You can select up to 3 goals.", variant: "default"});
           }}>
            <SelectTrigger id="content-goals" className="text-base h-auto min-h-10 py-2">
                <SelectValue placeholder="Select up to 3 goals">
                  {contentGoals.length > 0 ? contentGoals.join(', ') : "Select up to 3 goals"}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {availableGoals.map(goal => (
                    <SelectItem key={goal} value={goal} disabled={contentGoals.length >=3 && !contentGoals.includes(goal)}>
                        {goal} {contentGoals.includes(goal) ? ' ✓' : ''}
                    </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="brand-voice" className="text-base">Brand Voice Override (Optional)</Label>
          <Input
            id="brand-voice"
            placeholder="e.g., Playful and witty, or professional and informative"
            value={brandVoice}
            onChange={(e) => setBrandVoice(e.target.value)}
            className="text-base"
          />
          <p className="text-xs text-muted-foreground">
            If a Brand DNA analysis was performed, its voice profile will be used. You can provide specific voice instructions here to override or augment it for this campaign.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
        <Button 
            onClick={() => handleSaveCampaign(false)} 
            disabled={isSaving || isGenerating} 
            variant="outline"
            className="w-full sm:w-auto"
        >
          {isSaving && !isGenerating ? <Loader2 className="animate-spin" /> : <Save />} 
          {selectedCampaignForEdit ? "Save Changes" : "Save Draft"}
        </Button>
        <Button 
            onClick={() => handleSaveCampaign(true)} 
            disabled={isSaving || isGenerating} 
            size="lg" 
            className="w-full sm:w-auto"
        >
          {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 />} 
          {selectedCampaignForEdit ? "Update & Regenerate" : "Save & Generate Campaign"}
        </Button>
      </CardFooter>
    </Card>
  );
}
