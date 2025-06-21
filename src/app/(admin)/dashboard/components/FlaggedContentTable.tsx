
"use client";

import type { MultiFormatContent } from '@/types/content';
import type { FlaggedContentVersionItem } from '@/app/api/admin/content/flagged/route';
import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, ShieldAlert, MessageSquareWarning, AlertTriangle, SearchX, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface FlaggedContentTableProps {
  onViewCampaign: (campaignId: string) => void;
  onRefreshNeeded: () => void; // To trigger a refresh of the flagged content list
}

interface AiReviewResult {
    recommendation: 'Keep As Is' | 'Suggest User Revision' | 'Delete Immediately';
    justification: string;
    confidenceScore: number;
}

export function FlaggedContentTable({ onViewCampaign, onRefreshNeeded }: FlaggedContentTableProps) {
  const [flaggedItems, setFlaggedItems] = useState<FlaggedContentVersionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedContentForPreview, setSelectedContentForPreview] = useState<MultiFormatContent | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  
  const [isUnflagging, setIsUnflagging] = useState<string | null>(null);

  // State for AI Review Dialog
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedItemForReview, setSelectedItemForReview] = useState<FlaggedContentVersionItem | null>(null);
  const [reviewResult, setReviewResult] = useState<AiReviewResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  const fetchFlaggedContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/content/flagged');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch flagged content");
      }
      const data: FlaggedContentVersionItem[] = await response.json();
      setFlaggedItems(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      toast({ title: "Error Fetching Flagged Content", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFlaggedContent();
  }, [fetchFlaggedContent]);

  const handleUnflagVersion = async (item: FlaggedContentVersionItem) => {
    setIsUnflagging(item.versionId);
    try {
      const response = await fetch(`/api/admin/campaigns/${item.campaignId}/versions/${item.versionId}/flag`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFlagged: false, adminModerationNotes: '' }) 
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to unflag content version.");
      }
      toast({ title: "Content Version Unflagged", description: `Version ${item.versionNumber} of campaign "${item.campaignTitle}" has been unflagged and notes cleared.` });
      onRefreshNeeded(); 
      fetchFlaggedContent(); 
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      toast({ title: "Error Unflagging Version", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUnflagging(null);
    }
  };

  const handlePreviewContent = (item: FlaggedContentVersionItem) => {
    setSelectedContentForPreview(item.multiFormatContentSnapshot);
    setPreviewTitle(`Preview: ${item.campaignTitle} - V${item.versionNumber} (${item.actorName})`);
    setIsPreviewOpen(true);
  };

  const handleOpenAiReview = (item: FlaggedContentVersionItem) => {
    setSelectedItemForReview(item);
    setReviewResult(null); // Clear previous results
    setIsReviewOpen(true);
  };
  
  const runAiReview = useCallback(async () => {
    if (!selectedItemForReview) return;
    setIsReviewing(true);
    try {
      const response = await fetch('/api/admin/content/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: selectedItemForReview.campaignId,
          versionId: selectedItemForReview.versionId,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to run AI review.');
      setReviewResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      toast({ title: "AI Review Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsReviewing(false);
    }
  }, [selectedItemForReview, toast]);

  useEffect(() => {
    if (isReviewOpen && selectedItemForReview) {
      runAiReview();
    }
  }, [isReviewOpen, selectedItemForReview, runAiReview]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading flagged content...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Failed to Load Flagged Content</AlertTitle>
        <DialogDescription>{error}</DialogDescription>
      </Alert>
    );
  }

  if (flaggedItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <SearchX size={48} className="mx-auto mb-4" />
        <p className="text-lg font-semibold">No Content Currently Flagged</p>
        <p className="text-sm">All clear for now! Check back later or review campaigns to flag content.</p>
      </div>
    );
  }
  
  const getRecommendationColor = (recommendation: AiReviewResult['recommendation']) => {
    if (recommendation === 'Delete Immediately') return 'text-destructive';
    if (recommendation === 'Suggest User Revision') return 'text-orange-500';
    return 'text-green-500';
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Campaign</TableHead>
              <TableHead className="w-[80px]">Version</TableHead>
              <TableHead>Summary / Actor</TableHead>
              <TableHead>Moderation Notes</TableHead>
              <TableHead className="w-[150px]">Flagged On (Version Date)</TableHead>
              <TableHead className="text-right w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flaggedItems.map((item) => (
              <TableRow key={`${item.campaignId}-${item.versionId}`}>
                <TableCell>
                  <Button variant="link" className="p-0 h-auto text-left" onClick={() => onViewCampaign(item.campaignId)}>
                    {item.campaignTitle}
                  </Button>
                  <p className="text-xs text-muted-foreground">User ID: {item.campaignUserId}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">V{item.versionNumber}</Badge>
                </TableCell>
                <TableCell>
                    <p className="font-medium line-clamp-2">{item.changeSummary}</p>
                    <p className="text-xs text-muted-foreground">by {item.actorName}</p>
                </TableCell>
                <TableCell className="max-w-[300px]">
                  {item.adminModerationNotes ? (
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <p className="truncate text-sm text-destructive">{item.adminModerationNotes}</p>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs break-words bg-destructive text-destructive-foreground p-2 rounded shadow-lg">
                           <p className="text-xs">{item.adminModerationNotes}</p>
                        </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">No notes</span>
                  )}
                </TableCell>
                <TableCell>
                    <Tooltip>
                        <TooltipTrigger>
                            <span className="text-sm">{formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                            {format(new Date(item.timestamp), "PPPppp")}
                        </TooltipContent>
                    </Tooltip>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenAiReview(item)}>
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" /> AI Review
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleUnflagVersion(item)}
                    disabled={isUnflagging === item.versionId}
                  >
                    {isUnflagging === item.versionId ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin"/> : <ShieldAlert className="mr-1 h-3.5 w-3.5"/>}
                    Unflag
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck /> AI Content Review
            </DialogTitle>
            <DialogDescription>
              AI analysis of flagged content version {selectedItemForReview?.versionNumber} from campaign &quot;{selectedItemForReview?.campaignTitle}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isReviewing ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p>Running AI review...</p>
              </div>
            ) : reviewResult ? (
              <div className="space-y-4">
                 <Card>
                  <CardHeader className="text-center">
                    <CardDescription>AI Recommendation</CardDescription>
                    <CardTitle className={`text-2xl ${getRecommendationColor(reviewResult.recommendation)}`}>
                      {reviewResult.recommendation}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base">Justification</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{reviewResult.justification}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="text-center">
                      <CardDescription>Confidence</CardDescription>
                       <CardTitle className="text-4xl text-primary">
                        {reviewResult.confidenceScore}<span className="text-2xl text-muted-foreground">/100</span>
                      </CardTitle>
                    </CardHeader>
                     <CardContent>
                       <Progress value={reviewResult.confidenceScore} className="h-2" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <p>No review results available.</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            <Button onClick={runAiReview} disabled={isReviewing}>
              {isReviewing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Re-run Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>
              Quick preview of the flagged content version. Iterates through available formats.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] p-1 pr-4">
            {selectedContentForPreview && Object.values(selectedContentForPreview).some(text => !!text) ? (
                Object.entries(selectedContentForPreview).map(([format, text]) => 
                    text ? (
                    <div key={format} className="mb-4">
                        <h4 className="font-semibold text-sm capitalize mb-1">{format.replace(/([A-Z])/g, ' $1').trim()}</h4>
                        <pre className="whitespace-pre-wrap text-xs p-2 border rounded bg-muted/50">{text}</pre>
                    </div>
                    ) : null
                )
            ) : (
                <p className="text-muted-foreground">No content available in this version snapshot for preview.</p>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
