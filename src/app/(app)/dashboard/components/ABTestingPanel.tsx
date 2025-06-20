
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TestTube, Construction, Lock, TrendingUp } from 'lucide-react';
import type { ABTestInstance } from '@/types/content';
import { useSession } from 'next-auth/react';
import type { User as NextAuthUser } from 'next-auth';
import { Button } from '@/components/ui/button';

interface SessionUser extends NextAuthUser {
  level?: number;
}

interface ABTestingPanelProps {
  campaignId?: string;
  abTests: ABTestInstance[]; 
}

const FEATURE_UNLOCK_LEVEL = 3;

export function ABTestingPanel({ campaignId, abTests }: ABTestingPanelProps) {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const userLevel = user?.level || 1;
  const isFeatureLocked = userLevel < FEATURE_UNLOCK_LEVEL;


  if (isFeatureLocked) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <Lock className="h-6 w-6 text-primary/70" />
                A/B Testing Panel Locked
                </CardTitle>
                <CardDescription>
                This advanced feature unlocks at Level {FEATURE_UNLOCK_LEVEL}. Keep creating and providing feedback to level up!
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground space-y-4 py-10">
                <TrendingUp size={64} className="text-primary/50" />
                <h3 className="text-xl font-semibold">Reach Level {FEATURE_UNLOCK_LEVEL} to Unlock!</h3>
                <p className="text-center max-w-md">
                Your current level is {userLevel}. Engage more with ContentCraft AI to gain XP and unlock powerful tools like A/B testing.
                </p>
                {/* Optional: Add a button or link to guide users on how to gain XP */}
                {/* <Button variant="outline" onClick={() => alert("Gain XP by generating content and providing feedback on generated content!")}>How to Level Up?</Button> */}
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <TestTube className="h-6 w-6 text-primary" />
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
