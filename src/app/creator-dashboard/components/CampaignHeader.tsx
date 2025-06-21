
"use client";

import type { Campaign } from '@/types/content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';
import { format } from 'date-fns';

interface CampaignHeaderProps {
  campaign: Campaign;
  onEditClick: () => void;
}

export function CampaignHeader({ campaign, onEditClick }: CampaignHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-2xl">{campaign.title}</CardTitle>
            <CardDescription>
              Status: <Badge variant="secondary">{campaign.status}</Badge> | Last Updated: {format(new Date(campaign.updatedAt), "MMM d, yyyy, p")}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onEditClick}>
            <Pencil className="mr-2 h-4 w-4" /> Edit Campaign
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p><span className="font-semibold">Brief:</span> {campaign.brief}</p>
      </CardContent>
    </Card>
  );
}
