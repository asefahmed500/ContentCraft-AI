
"use client";

import type { Campaign } from '@/types/content';
import { CampaignCard } from './CampaignCard';
import { Skeleton } from '@/components/ui/skeleton';

interface CampaignListProps {
  campaigns: Campaign[];
  onView: (campaign: Campaign) => void;
  onDelete: (campaignId: string) => void;
}

export function CampaignList({ campaigns, onView, onDelete }: CampaignListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {campaigns.map((campaign) => (
        <CampaignCard 
          key={campaign.id} 
          campaign={campaign} 
          onView={() => onView(campaign)}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export function CampaignListSkeleton() {
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
