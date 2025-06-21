
"use client";

import type { Campaign } from '@/types/content';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Trash2, Edit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';


interface CampaignCardProps {
  campaign: Campaign;
  onView: () => void;
  onDelete: (campaignId: string) => void;
}

export function CampaignCard({ campaign, onView, onDelete }: CampaignCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const handleDeletePrompt = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCampaign = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/campaigns?id=${campaign.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete campaign.");
      }
      toast({ title: "Campaign Deleted", description: `Campaign "${campaign.title}" has been successfully deleted.` });
      onDelete(campaign.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Card className="flex flex-col justify-between hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="font-headline text-lg line-clamp-2">{campaign.title}</CardTitle>
          <CardDescription className="text-xs">
              Updated {formatDistanceToNow(new Date(campaign.updatedAt), { addSuffix: true })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {campaign.brief}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary">{campaign.status}</Badge>
              {campaign.isFlagged && <Badge variant="destructive">Flagged by Admin</Badge>}
              {campaign.isPrivate && <Badge variant="outline">Private</Badge>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end items-center gap-2 bg-muted/50 p-3 mt-auto">
            <Button variant="outline" size="sm" onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                View & Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeletePrompt}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
            </Button>
        </CardFooter>
      </Card>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the campaign "{campaign.title}" and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleDeleteCampaign} variant="destructive" disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Campaign
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
