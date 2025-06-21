
"use client";

import type { Campaign } from '@/types/content';
import type { BrandProfile } from '@/types/brand';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Beaker, FileText, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { analyzeBrandProfile } from '@/ai/flows/brand-learning';

interface BrandProfileDisplayProps {
  campaign: Campaign;
  onProfileUpdate: (updatedCampaign: Campaign) => void;
}

// Helper to convert base64 to data URI
const textToDataUri = (text: string) => {
    const base64 = btoa(unescape(encodeURIComponent(text)));
    return `data:text/plain;base64,${base64}`;
}

export function BrandProfileDisplay({ campaign, onProfileUpdate }: BrandProfileDisplayProps) {
  const { toast } = useToast();
  const [isAnalyzeDialogOpen, setIsAnalyzeDialogOpen] = useState(false);
  const [referenceText, setReferenceText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyzeBrand = async () => {
    if (!referenceText.trim()) {
      toast({ title: "Input Required", description: "Please paste some reference text to analyze.", variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);
    try {
      // 1. Convert text to data URI and call the analysis flow
      const contentDataUri = textToDataUri(referenceText);
      const brandProfile = await analyzeBrandProfile({ contentDataUri });

      // 2. Save the result to the campaign via API
      const response = await fetch(`/api/campaigns?id=${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandProfile }),
      });
      const updatedCampaign = await response.json();
      if (!response.ok) {
        throw new Error(updatedCampaign.error || "Failed to save brand profile to campaign.");
      }

      toast({ title: "Brand Profile Generated", description: "The brand profile has been analyzed and saved to this campaign." });
      onProfileUpdate(updatedCampaign); // Notify parent component to update state
      setIsAnalyzeDialogOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Analysis Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  if (!campaign.brandProfile) {
    return (
      <>
        <div className="text-center py-6">
          <p className="text-muted-foreground mb-4">No brand profile has been generated for this campaign yet.</p>
          <Button onClick={() => setIsAnalyzeDialogOpen(true)}>
            <Beaker className="mr-2 h-4 w-4" /> Analyze Brand Profile
          </Button>
        </div>
        <Dialog open={isAnalyzeDialogOpen} onOpenChange={setIsAnalyzeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Analyze Brand Profile</DialogTitle>
              <DialogDescription>
                Paste in some reference material (e.g., website copy, mission statement) to create a brand profile for this campaign.
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
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAnalyzeBrand} disabled={isAnalyzing}>
                {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isAnalyzing ? 'Analyzing...' : 'Analyze and Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const { voiceProfile, visualStyle, contentPatterns, consistencyScore } = campaign.brandProfile;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voice Profile</CardTitle>
          <CardDescription>Tone: <Badge variant="secondary">{voiceProfile.tone}</Badge></CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <h4 className="font-semibold">Values</h4>
            <p className="text-muted-foreground">{voiceProfile.values.join(', ')}</p>
          </div>
          <div>
            <h4 className="font-semibold">Language Style</h4>
            <p className="text-muted-foreground">{voiceProfile.languageStyle.join(', ')}</p>
          </div>
          <div>
            <h4 className="font-semibold">Keywords</h4>
            <p className="text-muted-foreground">{voiceProfile.keywords.join(', ')}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visual Style (Inferred)</CardTitle>
          <CardDescription>{visualStyle.imageryStyle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <h4 className="font-semibold">Color Palette</h4>
            <p className="text-muted-foreground">{visualStyle.colorPalette.join(', ')}</p>
          </div>
          <div>
            <h4 className="font-semibold">Font Preferences</h4>
            <p className="text-muted-foreground">{visualStyle.fontPreferences.join(', ')}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content Patterns</CardTitle>
           <CardDescription>Score: <Badge>{consistencyScore}/100</Badge></CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <h4 className="font-semibold">Common Themes</h4>
            <p className="text-muted-foreground">{contentPatterns.commonThemes.join(', ')}</p>
          </div>
           {contentPatterns.preferredFormats && contentPatterns.preferredFormats.length > 0 && (
            <div>
              <h4 className="font-semibold">Preferred Formats</h4>
              <p className="text-muted-foreground">{contentPatterns.preferredFormats.join(', ')}</p>
            </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
