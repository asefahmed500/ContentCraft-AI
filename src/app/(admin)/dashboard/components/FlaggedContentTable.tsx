
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
import { Loader2, Eye, ShieldAlert, MessageSquareWarning, AlertTriangle, SearchX } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle } from '@/components/ui/alert';

interface FlaggedContentTableProps {
  onViewCampaign: (campaignId: string) => void;
  onRefreshNeeded: () => void; // To trigger a refresh of the flagged content list
}

export function FlaggedContentTable({ onViewCampaign, onRefreshNeeded }: FlaggedContentTableProps) {
  const [flaggedItems, setFlaggedItems] = useState<FlaggedContentVersionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedContentForPreview, setSelectedContentForPreview] = useState<MultiFormatContent | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  
  const [isUnflagging, setIsUnflagging] = useState<string | null>(null); // Stores versionId being unflagged

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
        // Explicitly clear notes when unflagging
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
                  <Button variant="outline" size="sm" onClick={() => handlePreviewContent(item)}>
                    <Eye className="mr-1 h-3.5 w-3.5" /> Preview
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

