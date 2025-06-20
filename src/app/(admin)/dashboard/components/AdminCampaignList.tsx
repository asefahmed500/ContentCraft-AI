
"use client";

import type { Campaign } from '@/types/content';
import { useEffect, useState, useCallback } from 'react';
import { CampaignCard } from '@/app/(app)/dashboard/components/CampaignCard'; // Re-use existing card
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, ServerCrash, Trash2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AdminCampaignListProps {
  onCampaignSelect?: (campaignId: string | null, action: 'view' | 'edit') => void; // Optional for admin view
}

export function AdminCampaignList({ onCampaignSelect }: AdminCampaignListProps) {
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/campaigns'); // Use admin endpoint
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
      }));
      setAllCampaigns(campaignsWithDates);
      setFilteredCampaigns(campaignsWithDates); // Initially show all
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
    if (searchTerm) {
      campaignsToFilter = campaignsToFilter.filter(campaign => 
        campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.brief.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.userId.toLowerCase().includes(searchTerm.toLowerCase()) // Allow searching by User ID
      );
    }
    if (statusFilter !== 'all') {
      campaignsToFilter = campaignsToFilter.filter(campaign => campaign.status === statusFilter);
    }
    setFilteredCampaigns(campaignsToFilter);
  }, [searchTerm, statusFilter, allCampaigns]);


  // Admin might have different delete logic (e.g., direct delete without user check, or soft delete)
  // For now, reusing the client-side confirmation but API call would be different if needed
  const handleDeletePrompt = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCampaign = async () => {
    if (!campaignToDelete) return;
    
    // TODO: Implement admin-specific delete if different from user's own campaign delete
    // For now, this simulates a generic delete action.
    // Actual deletion for admins might bypass ownership checks or perform additional logging.
    
    toast({ title: "Delete Action (Admin)", description: `Simulating delete for campaign "${campaignToDelete.title}". Actual admin delete API needed.`, variant: "default" });
    // Example:
    // const response = await fetch(`/api/admin/campaigns/${campaignToDelete.id}`, { method: 'DELETE' });
    // if (response.ok) { fetchCampaigns(); } else { toast(...error) }
    setIsDeleteDialogOpen(false);
    setCampaignToDelete(null);
  };
  
  const handleViewCampaign = (campaignId: string) => {
    // For admin, "view" might lead to a detailed read-only page or use onCampaignSelect if provided for main dashboard integration
     if (onCampaignSelect) {
        onCampaignSelect(campaignId, 'view');
     } else {
        alert(`Admin view for campaign ${campaignId} - (Not fully implemented to load into main user dashboard preview from here, typically admin has separate view)`);
     }
  };

  const handleEditCampaign = (campaignId: string) => {
    // Admin edit might be restricted or lead to a specific admin edit interface
    if (onCampaignSelect) {
        onCampaignSelect(campaignId, 'edit'); // If admin can use the same edit form
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
        <Input 
          placeholder="Search campaigns (title, brief, user ID)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
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
            onEdit={() => handleEditCampaign(campaign.id)} // Admins can edit via same flow for now
            onDelete={() => handleDeletePrompt(campaign)}
            canEditOrDelete={true} // Admins can always edit/delete from their panel
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
              This action is destructive and cannot be undone by regular users.
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
    </>
  );
}
