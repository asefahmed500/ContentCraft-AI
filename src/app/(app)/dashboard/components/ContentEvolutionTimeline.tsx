
"use client";

import type { ContentVersion, Campaign } from '@/types/content'; // Added Campaign
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Bot, Edit3, Clock, Eye, GitCompareArrows, History, User, Flag, Loader2 } from 'lucide-react'; 
import { formatDistanceToNow, format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react'; 
import type { User as NextAuthUser } from 'next-auth';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SessionUser extends NextAuthUser {
  role?: 'viewer' | 'editor' | 'admin';
}

interface ContentEvolutionTimelineProps {
  versions: ContentVersion[];
  onViewVersion: (version: ContentVersion) => void;
  campaignId?: string; // Needed for API calls
  onVersionFlagged?: (updatedCampaign: Campaign) => void; // Callback to update parent campaign state
}

export function ContentEvolutionTimeline({ versions, onViewVersion, campaignId, onVersionFlagged }: ContentEvolutionTimelineProps) {
  const { toast } = useToast();
  const { data: session } = useSession(); 
  const user = session?.user as SessionUser | undefined;
  const isAdmin = user?.role === 'admin';

  const [isFlagVersionDialogOpen, setIsFlagVersionDialogOpen] = useState(false);
  const [versionToFlag, setVersionToFlag] = useState<ContentVersion | null>(null);
  const [versionFlaggingNotes, setVersionFlaggingNotes] = useState('');
  const [isSubmittingVersionFlag, setIsSubmittingVersionFlag] = useState(false);

  const sortedVersions = versions; 

  const getActorIcon = (actorName: string) => {
    const lowerActorName = actorName.toLowerCase();
    if (lowerActorName.includes('ai') || lowerActorName.includes('system') || lowerActorName.includes('agent') || lowerActorName.includes('team')) {
      return <Bot className="h-5 w-5 text-primary" />;
    }
    if (lowerActorName.includes('user')) {
      return <User className="h-5 w-5 text-accent" />;
    }
    return <Edit3 className="h-5 w-5 text-muted-foreground" />;
  };

  const handleCompareVersions = () => {
    toast({
      title: "Compare Versions (Coming Soon)",
      description: "Next step: Implement a side-by-side diff view for selected versions.",
    });
  };

  const handleRevertToVersion = () => {
    toast({
      title: "Revert to Version (Coming Soon)",
      description: "Next step: Implement logic to revert campaign content to this snapshot.",
    });
  };
  
  const handleFlagVersionPrompt = (version: ContentVersion) => {
    if (!isAdmin || !campaignId) return;
    setVersionToFlag(version);
    setVersionFlaggingNotes(version.adminModerationNotes || '');
    setIsFlagVersionDialogOpen(true);
  };

  const handleConfirmFlagVersion = async () => {
    if (!versionToFlag || !campaignId || !isAdmin) return;
    setIsSubmittingVersionFlag(true);
    const newFlagStatus = !versionToFlag.isFlagged;
    try {
        const response = await fetch(`/api/admin/campaigns/${campaignId}/versions/${versionToFlag.id}/flag`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ isFlagged: newFlagStatus, adminModerationNotes: versionFlaggingNotes })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to update content version flag status.");
        }
        toast({ title: "Content Version Moderation Updated", description: `Version ${versionToFlag.versionNumber} has been ${newFlagStatus ? 'flagged' : 'unflagged'}.`});
        if (onVersionFlagged && result.campaign) {
            onVersionFlagged(result.campaign); // Pass the entire updated campaign back
        }
        setIsFlagVersionDialogOpen(false);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        toast({ title: "Error Updating Version Flag", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSubmittingVersionFlag(false);
        setVersionToFlag(null);
        setVersionFlaggingNotes('');
    }
  };


  return (
    <TooltipProvider>
      <Card className="shadow-lg h-full flex flex-col">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Content Evolution Timeline
          </CardTitle>
          <CardDescription>
            Track how your content has changed and evolved throughout the creative process.
            {sortedVersions.length === 0 && " No versions yet for the selected campaign."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          {sortedVersions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Clock size={48} className="mb-4" />
              <p>No content versions available for this campaign yet.</p>
              <p className="text-sm">Generate content to see its evolution here.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] w-full pr-4">
              <div className="relative pl-6">
                <div className="absolute left-[0.55rem] top-0 bottom-0 w-0.5 bg-border -z-10"></div>

                {sortedVersions.map((version, index) => (
                  <div key={version.id || `version-${index}`} className="mb-6 relative"> 
                    <div className={`absolute left-0 top-1 h-5 w-5 rounded-full border-4 border-background ring-2 ${version.actorName.toLowerCase().includes('ai') || version.actorName.toLowerCase().includes('system') ? 'ring-primary bg-primary/50' : 'ring-accent bg-accent/50'}`}></div>
                    
                    <div className="ml-8">
                      <div className="flex items-center justify-between mb-1 flex-wrap">
                        <div className="flex items-center gap-2">
                          {getActorIcon(version.actorName)}
                          <span className="font-semibold">{version.actorName}</span>
                          <Badge variant="outline">Version {version.versionNumber || sortedVersions.length - index}</Badge>
                          {version.isFlagged && ( // Show flag for all users if flagged, admin can interact
                            <Tooltip>
                                <TooltipTrigger>
                                    <Flag className="h-4 w-4 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs">Flagged by Admin</p>
                                    {version.adminModerationNotes && <p className="text-xs mt-1">Notes: {version.adminModerationNotes}</p>}
                                </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap" title={format(new Date(version.timestamp), "PPPppp")}>
                          {formatDistanceToNow(new Date(version.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">{version.changeSummary}</p>
                       {version.isFlagged && version.adminModerationNotes && (
                            <p className="text-xs text-destructive/80 italic mb-2">Admin Notes: {version.adminModerationNotes}</p>
                       )}
                      
                      <div className="space-x-2 mt-2 flex flex-wrap gap-2">
                         {onViewVersion && (
                           <Button variant="outline" size="sm" onClick={() => onViewVersion(version)}>
                             <Eye className="mr-1 h-3.5 w-3.5" /> View Snapshot
                           </Button>
                         )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" onClick={handleCompareVersions}>
                                <GitCompareArrows className="mr-1 h-3.5 w-3.5" /> Compare
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Compare with previous version (Coming Soon)</p>
                            </TooltipContent>
                          </Tooltip>
                           <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" onClick={handleRevertToVersion}>
                                <History className="mr-1 h-3.5 w-3.5" /> Revert
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Revert to this version (Coming Soon)</p>
                            </TooltipContent>
                          </Tooltip>
                          {isAdmin && campaignId && ( 
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant={version.isFlagged ? "destructive" : "outline"} 
                                        size="sm" 
                                        onClick={() => handleFlagVersionPrompt(version)}
                                        disabled={isSubmittingVersionFlag && versionToFlag?.id === version.id}
                                    >
                                        {isSubmittingVersionFlag && versionToFlag?.id === version.id 
                                            ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin"/>
                                            : <Flag className="mr-1 h-3.5 w-3.5" />
                                        }
                                        {version.isFlagged ? "Unflag Version" : "Flag Version"}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{version.isFlagged ? "Remove flag from this version" : "Flag this version for review"}</p>
                                </TooltipContent>
                            </Tooltip>
                          )}
                      </div>
                      {index < sortedVersions.length -1 && <Separator className="mt-6" />}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFlagVersionDialogOpen} onOpenChange={setIsFlagVersionDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-primary"/>
                    {versionToFlag?.isFlagged ? "Unflag Content Version & Edit Notes" : "Flag Content Version & Add Notes"}
                </DialogTitle>
                <DialogDescription>
                    Campaign: <span className="font-semibold">&quot;{versionToFlag?.versionNumber ? `Version ${versionToFlag.versionNumber}` : ''}&quot;</span> from {campaignId}.
                    {versionToFlag?.isFlagged ? " This version is currently flagged." : " Flagging this version will mark it for review."}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="version-flagging-notes">Moderation Notes (Optional)</Label>
                <Textarea 
                    id="version-flagging-notes"
                    value={versionFlaggingNotes}
                    onChange={(e) => setVersionFlaggingNotes(e.target.value)}
                    placeholder="e.g., Inaccurate claim in paragraph 3, tone mismatch."
                    rows={3}
                />
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline" onClick={() => { setVersionToFlag(null); setVersionFlaggingNotes(''); }}>Cancel</Button>
                </DialogClose>
                <Button onClick={handleConfirmFlagVersion} disabled={isSubmittingVersionFlag}>
                    {isSubmittingVersionFlag && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {versionToFlag?.isFlagged ? "Unflag & Save Notes" : "Flag & Save Notes"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </TooltipProvider>
  );
}
