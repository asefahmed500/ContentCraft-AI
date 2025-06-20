
"use client";

import type { Campaign } from '@/types/content';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { Eye, Edit3, Trash2, CalendarDays, Info, Flag } from 'lucide-react';

interface CampaignCardProps {
  campaign: Campaign;
  onView: (campaignId: string) => void;
  onEdit: (campaignId: string) => void;
  onDelete: (campaignId: string) => void;
  onFlag?: (campaignId: string, currentFlagStatus: boolean, currentNotes?: string) => void; // For admin flagging
  canEditOrDelete?: boolean;
  isAdminView?: boolean; // To show user ID if admin is viewing
}

const statusColors: Record<Campaign['status'], string> = {
    draft: "bg-gray-500",
    debating: "bg-blue-500", 
    generating: "bg-purple-500",
    review: "bg-yellow-500 text-yellow-foreground", 
    published: "bg-green-500",
    archived: "bg-slate-600",
};

const statusText: Record<Campaign['status'], string> = {
    draft: "Draft",
    debating: "Under Debate",
    generating: "Generating Content",
    review: "Finalized (Review)",
    published: "Published",
    archived: "Archived",
};


export function CampaignCard({ campaign, onView, onEdit, onDelete, onFlag, canEditOrDelete, isAdminView }: CampaignCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
            <CardTitle className="font-headline text-xl leading-tight line-clamp-2">
            {campaign.isFlagged && <Flag className="inline-block h-5 w-5 mr-2 text-destructive" />}
            {campaign.title || "Untitled Campaign"}
            </CardTitle>
            <Badge className={`${statusColors[campaign.status]} text-white capitalize`}>
                {statusText[campaign.status]}
            </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground flex items-center pt-1">
          <CalendarDays className="h-3 w-3 mr-1" />
          Created: {campaign.createdAt ? format(new Date(campaign.createdAt), "MMM d, yyyy") : 'N/A'} 
          {campaign.createdAt ? ` (${formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })})` : ''}
        </CardDescription>
        {isAdminView && campaign.userId && (
            <CardDescription className="text-xs text-muted-foreground pt-1">
                User ID: {campaign.userId}
            </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow space-y-2 text-sm text-muted-foreground">
        {campaign.brief && (
             <p className="line-clamp-3"><span className="font-medium text-foreground">Brief:</span> {campaign.brief}</p>
        )}
        {campaign.targetAudience && (
            <p className="line-clamp-1"><span className="font-medium text-foreground">Audience:</span> {campaign.targetAudience}</p>
        )}
        {campaign.tone && (
            <p className="line-clamp-1"><span className="font-medium text-foreground">Tone:</span> {campaign.tone}</p>
        )}
        {campaign.contentGoals && campaign.contentGoals.length > 0 && (
             <p className="line-clamp-1"><span className="font-medium text-foreground">Goals:</span> {campaign.contentGoals.join(', ')}</p>
        )}
        {campaign.isFlagged && campaign.adminModerationNotes && (
            <p className="line-clamp-2 text-xs text-destructive/80 mt-1"><span className="font-medium">Admin Notes:</span> {campaign.adminModerationNotes}</p>
        )}
        {( !campaign.targetAudience && !campaign.tone && (!campaign.contentGoals || campaign.contentGoals.length === 0) && !campaign.brief) && (
            <div className="flex items-center text-muted-foreground/80">
                <Info className="h-4 w-4 mr-2"/>
                <p>No additional details provided for this campaign.</p>
            </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-4">
        <Button variant="outline" size="sm" onClick={() => onView(campaign.id)}>
          <Eye className="mr-1 h-4 w-4" /> View
        </Button>
        {canEditOrDelete && (
            <>
                <Button variant="outline" size="sm" onClick={() => onEdit(campaign.id)}>
                <Edit3 className="mr-1 h-4 w-4" /> Edit
                </Button>
                {onFlag && ( // Show flag button if handler is provided (typically in admin view)
                     <Button variant={campaign.isFlagged ? "destructive" : "outline"} size="sm" onClick={() => onFlag(campaign.id, campaign.isFlagged || false, campaign.adminModerationNotes)}>
                        <Flag className="mr-1 h-4 w-4" /> {campaign.isFlagged ? "Unflag" : "Flag"}
                    </Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => onDelete(campaign.id)}>
                <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
            </>
        )}
      </CardFooter>
    </Card>
  );
}

