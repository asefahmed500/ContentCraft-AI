
"use client";

import type { Campaign } from '@/types/content';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, PlusCircle, AlertTriangle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreateCampaignForm } from './components/CreateCampaignForm';
import { CampaignList } from './components/CampaignList';
import { CampaignDetailClient } from './components/CampaignDetailClient';
import { Alert, AlertTitle } from '@/components/ui/alert';

export default function CreatorDashboardPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/campaigns');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch campaigns');
      }
      const data: Campaign[] = await response.json();
      setCampaigns(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCampaignCreated = (newCampaign: Campaign) => {
    setCampaigns(prev => [newCampaign, ...prev]);
    setIsCreateDialogOpen(false);
    setSelectedCampaign(newCampaign); // Automatically view the newly created campaign
  };

  const handleCampaignUpdated = (updatedCampaign: Campaign) => {
    setCampaigns(prev => prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c));
    if (selectedCampaign && selectedCampaign.id === updatedCampaign.id) {
        setSelectedCampaign(updatedCampaign);
    }
  };

  const handleCampaignDeleted = (deletedCampaignId: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== deletedCampaignId));
    if (selectedCampaign && selectedCampaign.id === deletedCampaignId) {
        setSelectedCampaign(null);
    }
  };

  const handleViewCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
  };
  
  const handleBackToList = () => {
    setSelectedCampaign(null);
    fetchCampaigns(); // Refresh list in case of updates
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
  if (error) {
     return (
        <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Failed to Load Dashboard</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
     );
  }

  return (
    <div className="space-y-6">
      {!selectedCampaign ? (
        <>
          <div className="flex justify-between items-center">
            <div>
                <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">Your Campaigns</h1>
                <p className="text-lg text-muted-foreground">
                    Create, manage, and launch your AI-powered content campaigns.
                </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Campaign
            </Button>
          </div>

           {campaigns.length === 0 && !isLoading ? (
            <Card className="text-center py-12">
              <CardHeader>
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <CardTitle className="mt-4">No Campaigns Yet</CardTitle>
                <CardDescription>Get started by creating your first content campaign.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <CampaignList 
                campaigns={campaigns} 
                onView={handleViewCampaign}
                onDelete={handleCampaignDeleted}
            />
          )}
        </>
      ) : (
        <CampaignDetailClient 
            key={selectedCampaign.id} // Re-mount component when campaign changes
            initialCampaign={selectedCampaign} 
            onBack={handleBackToList}
            onCampaignUpdate={handleCampaignUpdated}
        />
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Campaign</DialogTitle>
            <DialogDescription>
              Start by giving your campaign a title and a brief description of your product or service.
            </DialogDescription>
          </DialogHeader>
          <CreateCampaignForm onSuccess={handleCampaignCreated} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
