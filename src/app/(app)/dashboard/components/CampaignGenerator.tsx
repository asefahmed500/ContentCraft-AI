
"use client";

import type { FormEvent, ChangeEvent} from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Lightbulb, Users, Target, Palette, FileUp, Save, Paperclip, Tag, Info, Link2, Combine } from 'lucide-react';
import type { Campaign } from '@/types/content'; 
import { Separator } from '@/components/ui/separator';

interface CampaignGeneratorProps {
  onCampaignCreated: (newCampaign: Campaign) => void; 
  onGenerateContentForCampaign: (campaign: Campaign, brandVoice?: string) => Promise<void>; 
  isGenerating: boolean; 
  selectedCampaignForEdit?: Campaign | null; 
}

const availableTones = ["Formal", "Informal", "Playful", "Serious", "Witty", "Empathetic", "Authoritative", "Casual", "Professional", "Friendly", "Bold", "Authentic", "Luxury", "Confident"];
const availableGoals = ["Brand Awareness", "Lead Generation", "Sales Conversion", "Engagement", "Education", "Community Building", "Website Traffic", "Product Launch"];


export function CampaignGenerator({ 
    onCampaignCreated, 
    onGenerateContentForCampaign, 
    isGenerating,
    selectedCampaignForEdit 
}: CampaignGeneratorProps) {
  const [campaignTitle, setCampaignTitle] = useState('');
  const [brief, setBrief] = useState(''); // Product/Service Description
  const [brandVoice, setBrandVoice] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [tone, setTone] = useState('');
  const [contentGoals, setContentGoals] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [referenceFiles, setReferenceFiles] = useState<FileList | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [isImportingUrl, setIsImportingUrl] = useState(false);


  const { toast } = useToast();

  useEffect(() => {
    if (selectedCampaignForEdit) {
      setCampaignTitle(selectedCampaignForEdit.title || '');
      setBrief(selectedCampaignForEdit.brief || '');
      setTargetAudience(selectedCampaignForEdit.targetAudience || '');
      setTone(selectedCampaignForEdit.tone || '');
      setContentGoals(selectedCampaignForEdit.contentGoals || []);
      setBrandVoice(''); 
      setReferenceFiles(null);
      setImportUrl('');
    } else {
      // Reset form for new campaign
      setCampaignTitle('');
      setBrief('');
      setTargetAudience('');
      setTone('');
      setContentGoals([]);
      setBrandVoice('');
      setReferenceFiles(null);
      setImportUrl('');
    }
  }, [selectedCampaignForEdit]);


  const handleSaveCampaign = async (andStartGeneration: boolean = false) => {
    if (!campaignTitle.trim()) {
      toast({ title: "Campaign Title is empty", description: "Please provide a campaign title.", variant: "destructive" });
      return;
    }
    if (!brief.trim()) {
      toast({ title: "Product/Service Description is empty", description: "Please provide a product/service description.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    const campaignData: Partial<Campaign> = {
      title: campaignTitle.trim(),
      brief: brief.trim(), 
      targetAudience: targetAudience.trim() || undefined,
      tone: tone || undefined,
      contentGoals: contentGoals.length > 0 ? contentGoals : undefined,
    };

    try {
      const method = selectedCampaignForEdit ? 'PUT' : 'POST';
      const url = selectedCampaignForEdit ? `/api/campaigns?id=${selectedCampaignForEdit.id}` : '/api/campaigns';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save campaign (${method})`);
      }
      const savedCampaign: Campaign = await response.json();
      
      toast({ title: `Campaign ${selectedCampaignForEdit ? "Updated" : "Created"}!`, description: `"${savedCampaign.title}" has been ${selectedCampaignForEdit ? "updated" : "created"}.` });
      onCampaignCreated(savedCampaign); 

      if (andStartGeneration) {
        await onGenerateContentForCampaign(savedCampaign, brandVoice.trim() || undefined);
      } else if (!selectedCampaignForEdit) { 
        setCampaignTitle(''); setBrief(''); setTargetAudience(''); setTone(''); setContentGoals([]); setBrandVoice(''); setReferenceFiles(null); setImportUrl('');
      }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({ title: "Failed to Save Campaign", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setReferenceFiles(e.target.files);
    if (e.target.files && e.target.files.length > 0) {
        const fileNames = Array.from(e.target.files).map(f => f.name).join(', ');
        toast({title: "Files Selected (Simulated)", description: `Selected: ${fileNames}. Full upload & processing for PDF/links is a planned feature.`});
    }
  };

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      toast({ title: "No URL provided", description: "Please enter a URL to import content.", variant: "destructive"});
      return;
    }
    setIsImportingUrl(true);
    toast({ title: "Importing Content...", description: `Attempting to fetch and analyze content from ${importUrl}. This is a simulation.`});

    // Simulate API call and processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const simulatedExtractedText = `Content successfully "imported" from: ${importUrl}.\n\n[Simulated extracted content appears here... This text is a placeholder. In a real system, the actual content from the URL would be fetched, parsed (e.g., using readability.js), and then displayed here or used for analysis.]\n\nPlease review and refine this text to serve as the core brief for your campaign. You can edit it directly below.`;
    setBrief(simulatedExtractedText);

    toast({ title: "Content Imported (Simulated)", description: "The 'Product or Service Description' has been updated. Please review and edit as needed."});
    setIsImportingUrl(false);
    setImportUrl(''); // Clear URL input after "import"
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
                : "Define your campaign: name, product/service, target audience, tone, and goals. Our AI agents will take it from there."
            }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="campaign-title" className="text-base flex items-center gap-1"><Tag className="h-4 w-4"/>Campaign Name*</Label>
          <Input
            id="campaign-title"
            placeholder="e.g., Spring Collection Launch, Q4 SaaS Promotion"
            value={campaignTitle}
            onChange={(e) => setCampaignTitle(e.target.value)}
            className="text-base"
            required
          />
        </div>
        
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="import-url" className="text-base flex items-center gap-1"><Link2 className="h-4 w-4"/>Import Content from URL (Optional)</Label>
                <div className="flex items-center space-x-2">
                    <Input
                        id="import-url"
                        placeholder="Paste URL (e.g., blog post, article)"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        className="text-base"
                    />
                    <Button onClick={handleImportFromUrl} disabled={isImportingUrl || !importUrl.trim()} variant="outline">
                        {isImportingUrl ? <Loader2 className="h-4 w-4 animate-spin"/> : <Combine className="h-4 w-4"/>}
                        Import & Use for Brief
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    This will attempt to fetch content from the URL and populate the description below (simulated).
                </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="campaign-brief" className="text-base flex items-center gap-1"><Info className="h-4 w-4"/>Product or Service Description*</Label>
              <Textarea
                id="campaign-brief"
                placeholder="Describe the product, service, or topic this campaign is about. e.g., Our new line of eco-friendly yoga mats made from recycled materials, designed for ultimate comfort and sustainability. You can also paste content here directly or use the URL import feature above."
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={8}
                className="text-base"
                required
              />
            </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="target-audience" className="text-base flex items-center gap-1"><Users className="h-4 w-4"/>Target Audience</Label>
            <Input
              id="target-audience"
              placeholder="e.g., Gen Z, Millennial Moms, B2B Tech Decision Makers"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tone" className="text-base flex items-center gap-1"><Palette className="h-4 w-4"/>Desired Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger id="tone" className="text-base">
                <SelectValue placeholder="Select tone (e.g., Playful, Bold)" />
              </SelectTrigger>
              <SelectContent>
                {availableTones.map(t => <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="content-goals" className="text-base flex items-center gap-1"><Target className="h-4 w-4"/>Content Goals (Select up to 3)</Label>
           <Select onValueChange={(value) => { /* This select is used for display only, logic is in items */ }}>
            <SelectTrigger id="content-goals" className="text-base h-auto min-h-10 py-2">
                <SelectValue placeholder="Select up to 3 goals">
                  {contentGoals.length > 0 ? contentGoals.join(', ') : "Select up to 3 goals"}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {availableGoals.map(goal => (
                    <SelectItem 
                        key={goal} 
                        value={goal} 
                        disabled={contentGoals.length >=3 && !contentGoals.includes(goal)}
                        onPointerDown={(e) => { 
                            e.preventDefault(); 
                            const newGoals = contentGoals.includes(goal) ? contentGoals.filter(g => g !== goal) : [...contentGoals, goal];
                             if (newGoals.length <= 3) {
                                setContentGoals(newGoals);
                             } else {
                                toast({ title: "Goal Limit Reached", description: "You can select up to 3 goals.", variant: "default"});
                             }
                        }}
                    >
                        {goal} {contentGoals.includes(goal) ? ' ✓' : ''}
                    </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {contentGoals.length > 0 && (
            <div className="pt-2 text-sm text-muted-foreground">
                Selected: {contentGoals.join(', ')}
            </div>
          )}
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
            If a Brand DNA analysis was performed, its voice profile will be used by default. You can provide specific voice instructions here to override or augment it for this campaign.
          </p>
        </div>

        <div className="space-y-2">
            <Label htmlFor="reference-materials" className="text-base flex items-center gap-1">
                <Paperclip className="h-4 w-4" /> Upload PDFs or Links (Reference Materials)
            </Label>
            <Input 
                id="reference-materials" 
                type="file" 
                multiple 
                onChange={handleFileChange}
                className="text-base"
                accept=".pdf, .txt, .md, .doc, .docx" 
                disabled // Full implementation requires backend storage & processing
            />
             {referenceFiles && referenceFiles.length > 0 && (
                <div className="pt-2 text-sm text-muted-foreground">
                    Selected files: {Array.from(referenceFiles).map(f => f.name).join(', ')}
                </div>
             )}
            <p className="text-xs text-muted-foreground">
                (File upload & URL parsing for AI processing (e.g. to GCS/GridFS & Gemini analysis) is a planned feature and currently simulated for UI. Files are not uploaded. Use the URL import above for brief generation).
            </p>
        </div>

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
        <Button 
            onClick={() => handleSaveCampaign(false)} 
            disabled={isSaving || isGenerating || isImportingUrl} 
            variant="outline"
            className="w-full sm:w-auto"
        >
          {isSaving && !andStartGeneration ? <Loader2 className="animate-spin" /> : <Save />} 
          {selectedCampaignForEdit ? "Save Changes" : "Save Draft"}
        </Button>
        <Button 
            onClick={() => handleSaveCampaign(true)} 
            disabled={isSaving || isGenerating || !campaignTitle.trim() || !brief.trim() || isImportingUrl} 
            size="lg" 
            className="w-full sm:w-auto"
        >
          {(isSaving || isGenerating) && andStartGeneration ? <Loader2 className="animate-spin" /> : <Wand2 />} 
          {selectedCampaignForEdit ? "Update & Regenerate" : "Save & Generate Campaign"}
        </Button>
      </CardFooter>
    </Card>
  );
}

