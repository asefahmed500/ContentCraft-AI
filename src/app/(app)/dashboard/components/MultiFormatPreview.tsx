
"use client";

import type { MultiFormatContent, UserFeedback, ContentVersion, Campaign } from '@/types/content';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Tv2, Copy, Download, Loader2, FileType, Share2, WandSparkles, ThumbsUp, ThumbsDown, MessageSquarePlus, Languages, Save, Flag, AlertTriangle } from 'lucide-react'; // Added Flag, AlertTriangle
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSession } from 'next-auth/react'; // Added useSession
import type { User as NextAuthUser } from 'next-auth'; // Added User type
import { Alert } from '@/components/ui/alert'; // Added Alert

interface SessionUser extends NextAuthUser {
  role?: 'viewer' | 'editor' | 'admin';
}

interface MultiFormatPreviewProps {
  content: MultiFormatContent | null;
  isLoading: boolean;
  campaignId?: string;
  currentCampaign?: Campaign | null; 
  currentContentVersion?: ContentVersion | null; 
  onFeedbackSubmittedSuccessfully?: (xpAmount: number, reason: string) => void;
  onSaveTranslatedContent?: (formatKey: keyof MultiFormatContent, translatedText: string, originalVersion: ContentVersion, targetLanguage: string) => Promise<void>;
}

const formatLabels: Record<keyof MultiFormatContent, string> = {
  blogPost: "Blog Post",
  tweet: "Tweet",
  linkedInArticle: "LinkedIn Article",
  instagramPost: "Instagram Post",
  tiktokScript: "TikTok Script",
  emailCampaign: "Email Campaign",
  adsCopy: "Ads Copy",
};

type FeedbackState = {
  [formatKey: string]: {
    rating: 1 | -1 | null;
    comment: string;
    showCommentBox: boolean;
    isSubmitting: boolean;
    submitted: boolean;
  }
};

const targetLanguages = [
    { value: "Spanish", label: "Spanish" },
    { value: "French", label: "French" },
    { value: "German", label: "German" },
    { value: "Japanese", label: "Japanese" },
    { value: "Chinese (Simplified)", label: "Chinese (Simplified)" },
    { value: "Portuguese", label: "Portuguese" },
    { value: "Italian", label: "Italian" },
    { value: "Russian", label: "Russian" },
    { value: "Arabic", label: "Arabic" },
    { value: "Korean", label: "Korean" },
];

export function MultiFormatPreview({ 
    content, 
    isLoading, 
    campaignId,
    currentCampaign,
    currentContentVersion,
    onFeedbackSubmittedSuccessfully,
    onSaveTranslatedContent
}: MultiFormatPreviewProps) {
  const { toast } = useToast();
  const { data: session } = useSession(); // Get session
  const user = session?.user as SessionUser | undefined;
  const isAdmin = user?.role === 'admin';

  const [feedbackState, setFeedbackState] = useState<FeedbackState>({});

  const [isTranslateDialogOpen, setIsTranslateDialogOpen] = useState(false);
  const [translateConfig, setTranslateConfig] = useState<{
    formatKey: keyof MultiFormatContent;
    originalText: string;
    campaignTone?: string;
  } | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isSavingTranslation, setIsSavingTranslation] = useState(false);


  const availableFormats = content 
    ? Object.keys(content).filter(key => {
        const contentKey = key as keyof MultiFormatContent;
        return content[contentKey] && typeof content[contentKey] === 'string' && (formatLabels[contentKey] !== undefined);
      }) as (keyof MultiFormatContent)[]
    : [];
  
  const handleCopy = (textToCopy: string | undefined | null, entityName?: string) => {
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => toast({ title: `${entityName || 'Content'} copied to clipboard!` }))
        .catch(err => toast({ title: "Failed to copy", description: err.message, variant: "destructive" }));
    } else {
        toast({ title: `Nothing to copy`, description: `${entityName || 'Content'} is empty.`, variant: "destructive" });
    }
  };

  const handleDownload = (textToDownload: string | undefined, formatName: string) => {
     if (textToDownload) {
      const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${formatName.toLowerCase().replace(/\s+/g, '-')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: `${formatName} TXT download started.` });
    } else {
        toast({ title: "Nothing to download", description: "Content is empty.", variant: "destructive" });
    }
  };

  const handleComingSoon = (featureName: string) => {
    toast({ title: `${featureName} is Coming Soon!`, description: `The next step is to implement the dialog for ${featureName.toLowerCase()} instructions and then call the API.`});
  };

  const handleOpenTranslateDialog = (formatKey: keyof MultiFormatContent) => {
    const originalText = content?.[formatKey];
    if (!originalText) {
        toast({ title: "No Content", description: "No content available for this format to translate.", variant: "destructive" });
        return;
    }
    setTranslateConfig({
        formatKey,
        originalText,
        campaignTone: currentCampaign?.tone
    });
    setTargetLanguage("");
    setTranslatedText(null);
    setIsTranslateDialogOpen(true);
  };

  const handleConfirmTranslation = async () => {
    if (!translateConfig || !targetLanguage) {
        toast({ title: "Missing Information", description: "Please select a target language.", variant: "destructive" });
        return;
    }
    setIsTranslating(true);
    setTranslatedText(null);
    try {
        const response = await fetch('/api/content/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                originalContent: translateConfig.originalText,
                targetLanguage: targetLanguage,
                toneDescription: translateConfig.campaignTone,
            }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || result.details || "Translation request failed.");
        }
        setTranslatedText(result.translatedContent);
        toast({ title: "Translation Successful", description: `Content translated to ${targetLanguage}.` });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during translation.";
        toast({ title: "Translation Failed", description: errorMessage, variant: "destructive" });
    } finally {
        setIsTranslating(false);
    }
  };

  const handleSaveTranslationVersion = async () => {
    if (!onSaveTranslatedContent || !currentContentVersion || !translateConfig || !translatedText || !targetLanguage) {
        toast({ title: "Cannot Save", description: "Missing necessary data to save translated version.", variant: "destructive"});
        return;
    }
    setIsSavingTranslation(true);
    try {
        await onSaveTranslatedContent(translateConfig.formatKey, translatedText, currentContentVersion, targetLanguage);
        toast({title: "Translation Saved", description: "Translated content saved as a new version."});
        setIsTranslateDialogOpen(false); 
    } catch (error) {
        // Error toast handled by the parent `onSaveTranslatedContent` typically
    } finally {
        setIsSavingTranslation(false);
    }
  };


  const handleFeedbackRating = (formatKey: keyof MultiFormatContent, rating: 1 | -1) => {
    setFeedbackState(prev => ({
      ...prev,
      [formatKey]: {
        ...(prev[formatKey] || { rating: null, comment: '', showCommentBox: false, isSubmitting: false, submitted: false }),
        rating: rating,
        showCommentBox: true,
        submitted: false,
      }
    }));
  };

  const handleFeedbackCommentChange = (formatKey: keyof MultiFormatContent, comment: string) => {
    setFeedbackState(prev => ({
      ...prev,
      [formatKey]: {
        ...(prev[formatKey] || { rating: null, comment: '', showCommentBox: false, isSubmitting: false, submitted: false }),
        comment: comment,
      }
    }));
  };

  const handleSubmitFeedback = async (formatKey: keyof MultiFormatContent) => {
    if (!campaignId) {
      toast({ title: "Error", description: "Campaign ID is missing. Cannot submit feedback.", variant: "destructive" });
      return;
    }
    const currentFeedback = feedbackState[formatKey];
    if (!currentFeedback || currentFeedback.rating === null) {
      toast({ title: "Error", description: "Please select a rating.", variant: "destructive" });
      return;
    }

    setFeedbackState(prev => ({ ...prev, [formatKey]: { ...prev[formatKey], isSubmitting: true } }));

    const feedbackData: UserFeedback = {
      campaignId,
      contentVersionId: currentContentVersion?.id,
      contentFormat: formatKey,
      rating: currentFeedback.rating,
      comment: currentFeedback.comment,
      timestamp: new Date(),
    };

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit feedback.");
      }
      
      toast({ title: "Feedback Submitted!", description: `Thanks for your feedback on the ${formatLabels[formatKey]}.` });
      if (onFeedbackSubmittedSuccessfully) {
        onFeedbackSubmittedSuccessfully(10, `Feedback on ${formatLabels[formatKey]}`);
      }
      
      setFeedbackState(prev => ({
        ...prev,
        [formatKey]: {
          ...prev[formatKey],
          isSubmitting: false,
          submitted: true,
          showCommentBox: false, 
        }
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Feedback Submission Failed", description: errorMessage, variant: "destructive" });
      setFeedbackState(prev => ({ ...prev, [formatKey]: { ...prev[formatKey], isSubmitting: false } }));
    }
  };
  
  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2"><Tv2 className="h-6 w-6 text-primary" />Multi-Format Content Preview</CardTitle>
          <CardDescription>Generating content in various formats... Please wait.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p>Agents are crafting your content...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!content || availableFormats.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2"><Tv2 className="h-6 w-6 text-primary" />Multi-Format Content Preview</CardTitle>
          <CardDescription>Generated content will appear here in various formats.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileText size={48} className="mb-4" />
            <p>No content generated or selected for preview.</p>
            <p className="text-sm">Start or select a campaign and generate content to see results.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const defaultTab = availableFormats.find(key => content[key]) || availableFormats[0] || "blogPost";

  return (
    <TooltipProvider>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2"><Tv2 className="h-6 w-6 text-primary" />Multi-Format Content Preview</CardTitle>
          <CardDescription>Preview the generated content. Copy, download, translate, or provide feedback to help our AI agents learn.</CardDescription>
          {isAdmin && currentContentVersion?.isFlagged && (
            <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-5 w-5" />
                <CardTitle className="text-sm font-semibold">Content Version Flagged for Review</CardTitle>
                {currentContentVersion.adminModerationNotes && (
                    <CardDescription className="text-xs mt-1">Admin Notes: {currentContentVersion.adminModerationNotes}</CardDescription>
                )}
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="w-full">
            <ScrollArea orientation="horizontal" className="pb-2 border-b">
              <TabsList className="grid w-full grid-cols-min sm:grid-cols-min lg:grid-cols-min xl:grid-cols-min gap-1 h-auto flex-wrap sm:flex-nowrap bg-transparent p-0">
                {availableFormats.map((formatKey) => (
                  <TabsTrigger 
                      key={formatKey} 
                      value={formatKey} 
                      className="text-xs sm:text-sm break-all px-3 py-2 whitespace-nowrap data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:text-primary rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                  >
                    {formatLabels[formatKey] || formatKey}
                    {isAdmin && currentContentVersion?.isFlagged && <Flag className="ml-2 h-3 w-3 text-destructive" />}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
            {availableFormats.map((formatKey) => {
              const currentFeedback = feedbackState[formatKey] || { rating: null, comment: '', showCommentBox: false, isSubmitting: false, submitted: false };
              return (
              <TabsContent key={formatKey} value={formatKey} className="mt-4">
                <Card className="border shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/30 rounded-t-lg flex-wrap gap-2">
                    <CardTitle className="font-headline text-lg flex items-center gap-2">
                        {formatLabels[formatKey] || formatKey}
                        {isAdmin && currentContentVersion?.isFlagged && (
                            <Tooltip>
                                <TooltipTrigger>
                                    <Flag className="h-4 w-4 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs">This version is flagged by an admin.</p>
                                    {currentContentVersion.adminModerationNotes && <p className="text-xs mt-1">Notes: {currentContentVersion.adminModerationNotes}</p>}
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleCopy(content?.[formatKey])}>
                        <Copy className="mr-1 h-3 w-3" /> Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownload(content?.[formatKey], formatLabels[formatKey] || formatKey)}>
                        <Download className="mr-1 h-3 w-3" /> TXT
                      </Button>
                       <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => handleComingSoon('AI Revise')}>
                            <WandSparkles className="mr-1 h-3 w-3" /> AI Revise
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Get AI-powered revision suggestions (Coming Soon)</p>
                        </TooltipContent>
                      </Tooltip>
                       <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => handleOpenTranslateDialog(formatKey)}>
                                <Languages className="mr-1 h-3 w-3" /> Translate
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Translate this content</p></TooltipContent>
                       </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" disabled onClick={() => handleComingSoon('PDF Export')}>
                            <FileType className="mr-1 h-3 w-3" /> PDF
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Export as PDF (Coming Soon)</p>
                        </TooltipContent>
                      </Tooltip>
                       <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="outline" size="sm" disabled onClick={() => handleComingSoon('Share/Schedule')}>
                            <Share2 className="mr-1 h-3 w-3" /> Share
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Share or Schedule (Coming Soon)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ScrollArea className="h-[250px] w-full rounded-md border p-4 bg-background">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {content[formatKey] || "No content for this format."}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-3 pt-4 border-t">
                    <div className="text-sm font-medium">Rate this content:</div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant={currentFeedback.rating === 1 ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => handleFeedbackRating(formatKey, 1)}
                        disabled={currentFeedback.isSubmitting || currentFeedback.submitted}
                        className={currentFeedback.rating === 1 ? "border-green-500 text-green-500 hover:bg-green-500/10" : ""}
                      >
                        <ThumbsUp className="mr-1 h-4 w-4" /> Good
                      </Button>
                      <Button 
                        variant={currentFeedback.rating === -1 ? "destructive" : "outline"} 
                        size="sm" 
                        onClick={() => handleFeedbackRating(formatKey, -1)}
                        disabled={currentFeedback.isSubmitting || currentFeedback.submitted}
                      >
                        <ThumbsDown className="mr-1 h-4 w-4" /> Needs Improvement
                      </Button>
                    </div>
                    {currentFeedback.showCommentBox && !currentFeedback.submitted && (
                      <div className="w-full space-y-2 mt-2">
                        <Textarea 
                          placeholder="Optional: Add a comment (e.g., 'Too formal', 'Try a pun')" 
                          value={currentFeedback.comment}
                          onChange={(e) => handleFeedbackCommentChange(formatKey, e.target.value)}
                          rows={2}
                          className="text-sm"
                          disabled={currentFeedback.isSubmitting}
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleSubmitFeedback(formatKey)} 
                          disabled={currentFeedback.isSubmitting}
                        >
                          {currentFeedback.isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-1" /> : <MessageSquarePlus className="mr-1 h-4 w-4" />}
                          Submit Feedback
                        </Button>
                      </div>
                    )}
                    {currentFeedback.submitted && (
                        <p className="text-sm text-green-600 mt-2">Thanks for your feedback!</p>
                    )}
                  </CardFooter>
                </Card>
              </TabsContent>
            )})}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isTranslateDialogOpen} onOpenChange={setIsTranslateDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Languages className="h-5 w-5 text-primary"/>Translate Content</DialogTitle>
            <DialogDescription>
              Translate the content for &quot;{translateConfig?.formatKey ? formatLabels[translateConfig.formatKey] : ''}&quot; to another language.
              {translateConfig?.campaignTone && <span className="block text-xs mt-1">Original Tone Hint: {translateConfig.campaignTone}</span>}
            </DialogDescription>
          </DialogHeader>
          {translateConfig && (
            <div className="space-y-4 py-4">
                <div>
                    <Label className="text-sm font-semibold">Original Text ({translateConfig.formatKey ? formatLabels[translateConfig.formatKey] : ''}):</Label>
                    <ScrollArea className="h-32 mt-1 rounded-md border p-3 bg-muted/50">
                        <pre className="whitespace-pre-wrap text-xs">{translateConfig.originalText}</pre>
                    </ScrollArea>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="target-language" className="text-sm font-semibold">Select Target Language*</Label>
                    <Select value={targetLanguage} onValueChange={setTargetLanguage} disabled={isTranslating}>
                        <SelectTrigger id="target-language">
                            <SelectValue placeholder="Choose language..." />
                        </SelectTrigger>
                        <SelectContent>
                            {targetLanguages.map(lang => (
                                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleConfirmTranslation} disabled={isTranslating || !targetLanguage} className="w-full sm:w-auto">
                    {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4"/>}
                    Translate with AI
                </Button>

                {translatedText && (
                    <div className="mt-4 space-y-2">
                        <Label className="text-sm font-semibold">Translated Text ({targetLanguage}):</Label>
                         <div className="relative">
                            <ScrollArea className="h-32 mt-1 rounded-md border p-3 bg-background">
                                <pre className="whitespace-pre-wrap text-xs">{translatedText}</pre>
                            </ScrollArea>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className="absolute top-2 right-2 h-7 w-7"
                                onClick={() => handleCopy(translatedText, "Translated text")}
                            >
                                <Copy className="h-3.5 w-3.5"/>
                                <span className="sr-only">Copy translated text</span>
                            </Button>
                        </div>
                        {onSaveTranslatedContent && currentContentVersion && (
                             <Button 
                                onClick={handleSaveTranslationVersion} 
                                disabled={isSavingTranslation}
                                className="w-full sm:w-auto mt-2"
                                variant="default"
                            >
                                {isSavingTranslation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
                                Save Translation as New Version
                            </Button>
                        )}
                    </div>
                )}
            </div>
          )}
          <DialogFooter className="sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => { setTranslatedText(null); setTargetLanguage(''); }}>
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </TooltipProvider>
  );
}

