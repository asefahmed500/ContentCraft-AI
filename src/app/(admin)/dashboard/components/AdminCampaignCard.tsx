
"use client";

import type { Campaign } from '@/types/content';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Flag, ShieldAlert, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AdminCampaignCardProps {
  campaign: Campaign;
  onView: () => void;
  onFlag: () => void;
  onDelete: () => void;
}

export function AdminCampaignCard({ campaign, onView, onFlag, onDelete }: AdminCampaignCardProps) {
  return (
    <Card className="flex flex-col justify-between hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="font-headline text-lg line-clamp-2">{campaign.title}</CardTitle>
        <CardDescription className="flex flex-wrap gap-2 items-center text-xs">
            <span>By User ID: {campaign.userId}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {campaign.brief}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary">{campaign.status}</Badge>
            {campaign.isFlagged && <Badge variant="destructive" className="gap-1"><ShieldAlert className="h-3 w-3" /> Flagged</Badge>}
            {campaign.isPrivate && <Badge variant="outline">Private</Badge>}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-muted/50 p-3 mt-auto">
        <p className="text-xs text-muted-foreground">
          Updated {formatDistanceToNow(new Date(campaign.updatedAt), { addSuffix: true })}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onView} title="View Details">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFlag} title="Flag/Unflag Campaign">
            <Flag className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="icon" className="h-8 w-8" onClick={onDelete} title="Delete Campaign">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
