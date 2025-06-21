
"use client";

import type { Campaign } from '@/types/content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentDebateDisplay } from '@/components/AgentDebateDisplay';
import { ContentCalendarDisplay } from './ContentCalendarDisplay';
import { Beaker, Bot, MessageSquare, Sparkles, CalendarDays, FlaskConical, Loader2 } from 'lucide-react';

interface CampaignToolsProps {
  campaign: Campaign;
  isDebating: boolean;
  isGeneratingSchedule: boolean;
  onRunWarRoom: () => void;
  onGenerateSchedule: () => void;
  onAnalyzeBrandClick: () => void;
}

export function CampaignTools({
  campaign,
  isDebating,
  isGeneratingSchedule,
  onRunWarRoom,
  onGenerateSchedule,
  onAnalyzeBrandClick,
}: CampaignToolsProps) {
  return (
    <div className="lg:col-span-1 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><FlaskConical className="h-5 w-5 text-primary"/> Brand Profile</CardTitle>
          <CardDescription>The analyzed brand identity for this campaign.</CardDescription>
        </CardHeader>
        <CardContent>
          {!campaign.brandProfile ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4 text-sm">No brand profile generated yet.</p>
              <Button onClick={onAnalyzeBrandClick} size="sm">
                <Beaker className="mr-2 h-4 w-4" /> Analyze Brand Profile
              </Button>
            </div>
          ) : (
            <div className="text-sm space-y-2">
              <p><strong>Tone:</strong> <Badge variant="outline">{campaign.brandProfile.voiceProfile.tone}</Badge></p>
              <p><strong>Values:</strong> {campaign.brandProfile.voiceProfile.values.join(', ')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Bot className="h-5 w-5 text-primary"/> Creative War Room</CardTitle>
          <CardDescription>AI agents collaborate on the strategy.</CardDescription>
        </CardHeader>
        <CardContent>
          {campaign.agentDebates.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4 text-sm">The debate has not started.</p>
              <Button onClick={onRunWarRoom} disabled={isDebating} size="sm">
                {isDebating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <MessageSquare className="mr-2 h-4 w-4" />}
                {isDebating ? 'Debating...' : 'Start Strategy Session'}
              </Button>
            </div>
          ) : (
            <AgentDebateDisplay debates={campaign.agentDebates} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-primary"/> Content Calendar</CardTitle>
          <CardDescription>Generate a strategic content schedule.</CardDescription>
        </CardHeader>
        <CardContent>
          {(!campaign.scheduledPosts || campaign.scheduledPosts.length === 0) ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4 text-sm">No content schedule has been generated yet.</p>
              <Button onClick={onGenerateSchedule} disabled={isGeneratingSchedule} size="sm">
                {isGeneratingSchedule ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                {isGeneratingSchedule ? 'Generating...' : 'Generate Schedule'}
              </Button>
            </div>
          ) : (
            <ContentCalendarDisplay schedule={campaign.scheduledPosts} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
