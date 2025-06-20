
"use client";

import type { Campaign } from '@/types/content';
import { useEffect, useState } from 'react';
import { CampaignCard } from './CampaignCard';
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
import { Button } from '@/components/ui/button';


interface CampaignListProps {
  refreshTrigger: number; // Increment to trigger a re-fetch
  onCampaignSelect: (campaignId: string | null, action: 'view' | 'edit') => void;
}

export function CampaignList({ refreshTrigger, onCampaignSelect }: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);


  useEffect(() => {
    const fetchCampaigns = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/campaigns');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch campaigns: ${response.statusText}`);
        }
        const data: Campaign[] = await response.json();
        setCampaigns(data);
      } catch (err) {
        console.error("CampaignList fetch error:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(errorMessage);
        toast({ title: "Error fetching campaigns", description: errorMessage, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaigns();
  }, [refreshTrigger, toast]);

  const handleDeletePrompt = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCampaign = async () => {
    if (!campaignToDelete) return;
    
    // Use a temporary variable for the toast message before setting campaignToDelete to null
    const campaignTitleForToast = campaignToDelete.title;

    // Optimistically update UI or show loading state
    const originalCampaigns = [...campaigns];
    setCampaigns(campaigns.filter(c => c.id !== campaignToDelete.id));
    setIsDeleteDialogOpen(false); // Close dialog immediately

    try {
      const response = await fetch(`/api/campaigns?id=${campaignToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        // Revert optimistic update if delete failed
        setCampaigns(originalCampaigns);
        throw new Error(errorData.error || 'Failed to delete campaign');
      }
      toast({ title: "Campaign Deleted", description: `"${campaignTitleForToast}" has been successfully deleted.` });
      // No need to call onCampaignSelect here unless you want to clear a selected campaign view
      if (typeof onCampaignSelect === 'function') {
        onCampaignSelect(null, 'view'); // Clear selection if deleted campaign was selected
      }
    } catch (err) {
      // Revert optimistic update
      setCampaigns(originalCampaigns);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during deletion.";
      toast({ title: "Error Deleting Campaign", description: errorMessage, variant: "destructive" });
    } finally {
      setCampaignToDelete(null); // Clear the campaign to delete state
    }
  };

  if (isLoading && campaigns.length === 0) {
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

  if (campaigns.length === 0) {
    return (
      <Alert>
        <Info className="h-5 w-5" />
        <AlertTitle>No Campaigns Yet</AlertTitle>
        <AlertDescription>
          You haven&apos;t created any campaigns. Start by generating a new one!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <CampaignCard 
            key={campaign.id} 
            campaign={campaign} 
            onView={() => onCampaignSelect(campaign.id, 'view')}
            onEdit={() => onCampaignSelect(campaign.id, 'edit')}
            onDelete={() => handleDeletePrompt(campaign)}
          />
        ))}
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive"/> Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the campaign 
              <span className="font-semibold"> &quot;{campaignToDelete?.title || 'this campaign'}&quot; </span> 
              and all its associated data including content versions and debate logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCampaignToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Yes, Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
