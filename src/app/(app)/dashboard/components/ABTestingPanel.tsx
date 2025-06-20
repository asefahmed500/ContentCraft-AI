
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TestTubeDual, Construction } from 'lucide-react';
import type { ABTestInstance } from '@/types/content';

interface ABTestingPanelProps {
  campaignId?: string;
  abTests: ABTestInstance[]; // Currently, this will be empty from the backend
}

export function ABTestingPanel({ campaignId, abTests }: ABTestingPanelProps) {
  // For now, this component will be a placeholder.
  // Future enhancements would allow creating/viewing A/B tests,
  // selecting a specific A/B test if multiple exist,
  // then showing side-by-side comparisons for chosen formats.

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <TestTubeDual className="h-6 w-6 text-primary" />
          A/B Testing Simulation
        </CardTitle>
        <CardDescription>
          Create and compare content variations, predict their performance, and get AI recommendations for the winning version.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground space-y-4 py-10">
        <Construction size={64} className="text-primary/70" />
        <h3 className="text-xl font-semibold">Coming Soon!</h3>
        <p className="text-center max-w-md">
          The A/B testing module is under development. Soon, you'll be able to:
        </p>
        <ul className="list-disc list-inside text-sm text-left max-w-md space-y-1">
          <li>Generate A and B versions of your content (or select existing versions).</li>
          <li>Get AI-predicted performance metrics for each variation.</li>
          <li>View side-by-side comparisons.</li>
          <li>Receive an AI recommendation for the best-performing version.</li>
        </ul>
         {!campaignId && <p className="mt-4 text-sm font-semibold">Please select a campaign to enable A/B testing features.</p>}
         {campaignId && abTests.length === 0 && <p className="mt-4 text-sm">No A/B tests initiated for this campaign yet.</p>}
      </CardContent>
    </Card>
  );
}
