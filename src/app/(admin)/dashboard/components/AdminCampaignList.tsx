
"use client";

import type { Campaign } from '@/types/content';
import { useEffect, useState, useCallback } from 'react';
import { CampaignCard } from '@/app/(app)/dashboard/components/CampaignCard'; 
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, ServerCrash, Trash2, Flag, MessageSquare, Search as SearchIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AdminCampaignListProps {
  onCampaignSelect?: (campaignId: string | null, action: 'view' | 'edit') => void; 
}

export function AdminCampaignList({ onCampaignSelect }: AdminCampaignListProps) {
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

  const [isFlaggingDialogOpen, setIsFlaggingDialogOpen] = useState(false);
  const [campaignToFlag, setCampaignToFlag] = useState<Campaign | null>(null);
  const [flaggingNotes, setFlaggingNotes] = useState('');
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [flaggedFilter, setFlaggedFilter] = useState('all');


  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/campaigns'); 
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch campaigns: ${response.statusText}`);
      }
      const data: Campaign[] = await response.json();
      const campaignsWithDates = data.map(c => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        agentDebates: (c.agentDebates || []).map(ad => ({...ad, timestamp: new Date(ad.timestamp)})),
        contentVersions: (c.contentVersions || []).map(cv => ({...cv, timestamp: new Date(cv.timestamp)})),
        isFlagged: c.isFlagged ?? false,
        adminModerationNotes: c.adminModerationNotes ?? '',
      }));
      setAllCampaigns(campaignsWithDates);
    } catch (err) {
      console.error("AdminCampaignList fetch error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      toast({ title: "Error fetching campaigns", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    let campaignsToFilter = [...allCampaigns];
    const lowerSearchTerm = searchTerm.toLowerCase();

    if (searchTerm) {
      campaignsToFilter = campaignsToFilter.filter(campaign => 
        campaign.title.toLowerCase().includes(lowerSearchTerm) ||
        campaign.brief.toLowerCase().includes(lowerSearchTerm) ||
        (campaign.userId && campaign.userId.toLowerCase().includes(lowerSearchTerm)) ||
        (campaign.id && campaign.id.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (statusFilter !== 'all') {
      campaignsToFilter = campaignsToFilter.filter(campaign => campaign.status === statusFilter);
    }
    if (flaggedFilter !== 'all') {
        campaignsToFilter = campaignsToFilter.filter(campaign => campaign.isFlagged === (flaggedFilter === 'flagged'));
    }
    setFilteredCampaigns(campaignsToFilter);
  }, [searchTerm, statusFilter, flaggedFilter, allCampaigns]);

  const handleDeletePrompt = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCampaign = async () => {
    if (!campaignToDelete) return;
    toast({ title: "Delete Action (Admin)", description: `Simulating delete for campaign "${campaignToDelete.title}". Actual admin delete API for any campaign (not just own) is needed.`, variant: "default" });
    // Example:
    // const response = await fetch(`/api/admin/campaigns/${campaignToDelete.id}/delete`, { method: 'DELETE' }); // Needs a dedicated admin delete endpoint
    // if (response.ok) { fetchCampaigns(); } else { toast(...error) }
    setIsDeleteDialogOpen(false);
    setCampaignToDelete(null);
  };
  
  const handleFlagPrompt = (campaignId: string, currentFlagStatus: boolean, currentNotes?: string) => {
    const campaign = allCampaigns.find(c => c.id === campaignId);
    if (campaign) {
        setCampaignToFlag(campaign);
        setFlaggingNotes(currentNotes || '');
        setIsFlaggingDialogOpen(true);
    }
  };

  const handleConfirmFlag = async () => {
    if (!campaignToFlag) return;
    setIsSubmittingFlag(true);
    const newFlagStatus = !campaignToFlag.isFlagged;
    try {
        const response = await fetch(`/api/admin/campaigns/${campaignToFlag.id}/flag`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ isFlagged: newFlagStatus, adminModerationNotes: flaggingNotes })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update campaign flag status.");
        }
        toast({ title: "Campaign Moderation Updated", description: `Campaign "${campaignToFlag.title}" has been ${newFlagStatus ? 'flagged' : 'unflagged'}.`});
        fetchCampaigns(); // Refresh the list
        setIsFlaggingDialogOpen(false);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        toast({ title: "Error Updating Flag", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSubmittingFlag(false);
        setCampaignToFlag(null);
        setFlaggingNotes('');
    }
  };


  const handleViewCampaign = (campaignId: string) => {
     if (onCampaignSelect) {
        onCampaignSelect(campaignId, 'view');
     } else {
        alert(`Admin view for campaign ${campaignId} - (Not fully implemented to load into main user dashboard preview from here, typically admin has separate view)`);
     }
  };

  const handleEditCampaign = (campaignId: string) => {
    if (onCampaignSelect) {
        onCampaignSelect(campaignId, 'edit'); 
    } else {
        alert(`Admin edit for campaign ${campaignId} - (Not implemented to load into main user dashboard editor from here)`);
    }
  };

  if (isLoading && filteredCampaigns.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="flex flex-col space-y-3">
            <Skeleton className="h-[125px] w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
             <Skeleton className="h-8 w-1/4 ml-auto mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <ServerCrash className="h-5 w-5" />
        <AlertTitle>Failed to Load Campaigns</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-grow sm:max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search (title, brief, user/campaign ID)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="debating">Debating</SelectItem>
            <SelectItem value="generating">Generating</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={flaggedFilter} onValueChange={setFlaggedFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by flag status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Flag Statuses</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="not_flagged">Not Flagged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredCampaigns.length === 0 && !isLoading && (
        <Alert>
          <Info className="h-5 w-5" />
          <AlertTitle>No Campaigns Found</AlertTitle>
          <AlertDescription>
            No campaigns match your current filters, or no campaigns exist yet.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCampaigns.map((campaign) => (
          <CampaignCard 
            key={campaign.id} 
            campaign={campaign} 
            onView={() => handleViewCampaign(campaign.id)}
            onEdit={() => handleEditCampaign(campaign.id)}
            onDelete={() => handleDeletePrompt(campaign)}
            onFlag={handleFlagPrompt}
            canEditOrDelete={true} 
            isAdminView={true}
          />
        ))}
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive"/> Confirm Deletion (Admin)
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the campaign 
              <span className="font-semibold"> &quot;{campaignToDelete?.title || 'this campaign'}&quot; </span>. 
              This action is destructive and cannot be undone by regular users. (Note: Admin delete logic may differ).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCampaignToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Yes, Delete Campaign (Admin)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isFlaggingDialogOpen} onOpenChange={setIsFlaggingDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-primary"/>
                    {campaignToFlag?.isFlagged ? "Unflag Campaign & Edit Notes" : "Flag Campaign & Add Notes"}
                </DialogTitle>
                <DialogDescription>
                    Campaign: <span className="font-semibold">&quot;{campaignToFlag?.title || ''}&quot;</span>. 
                    {campaignToFlag?.isFlagged ? " This campaign is currently flagged." : " Flagging this campaign will mark it for review."}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="flagging-notes">Moderation Notes (Optional)</Label>
                <Textarea 
                    id="flagging-notes"
                    value={flaggingNotes}
                    onChange={(e) => setFlaggingNotes(e.target.value)}
                    placeholder="e.g., Contains inappropriate content, needs brand voice review."
                    rows={3}
                />
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline" onClick={() => { setCampaignToFlag(null); setFlaggingNotes(''); }}>Cancel</Button>
                </DialogClose>
                <Button onClick={handleConfirmFlag} disabled={isSubmittingFlag}>
                    {isSubmittingFlag && <ServerCrash className="mr-2 h-4 w-4 animate-spin" />}
                    {campaignToFlag?.isFlagged ? "Unflag & Save Notes" : "Flag & Save Notes"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

