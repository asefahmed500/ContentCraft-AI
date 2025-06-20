"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Activity, Bot, Edit3, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ContentVersion {
  id: string;
  agentName: string; // Could be 'User Edit' or specific agent
  timestamp: Date;
  changeSummary: string;
  text: string; // Or a diff, or snapshot of key fields
}

interface ContentEvolutionTimelineProps {
  campaignId: string; // To fetch historical versions if needed
  contentVersions: ContentVersion[];
}

export function ContentEvolutionTimeline({ campaignId, contentVersions }: ContentEvolutionTimelineProps) {
  // In a real app, campaignId would be used to fetch versions if not passed directly.
  // For now, we rely on contentVersions prop.

  const versions = contentVersions.length > 0 ? contentVersions : [
    { 
      id: 'placeholder-1', 
      agentName: 'System', 
      timestamp: new Date(), 
      changeSummary: 'No content versions available for this campaign yet. Start a campaign to see its evolution.',
      text: 'N/A'
    }
  ];


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Content Evolution Timeline
        </CardTitle>
        <CardDescription>
          Track how your content has changed and evolved throughout the creative process.
          {versions[0].id === 'placeholder-1' && " Currently showing placeholder data."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {versions.length === 0 || versions[0].id === 'placeholder-1' ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Clock size={48} className="mb-4" />
            <p>No content versions available for this campaign yet.</p>
            <p className="text-sm">Generate a campaign to see its evolution here.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] w-full pr-4">
            <div className="relative pl-6">
              {/* Timeline Line */}
              <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border"></div>

              {versions.slice().reverse().map((version, index) => (
                <div key={version.id} className="mb-8 relative">
                  {/* Dot on the timeline */}
                  <div className="absolute left-[-0.6rem] top-1 h-5 w-5 rounded-full bg-primary border-4 border-background"></div>
                  
                  <div className="ml-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {version.agentName.toLowerCase().includes('ai') || version.agentName.toLowerCase().includes('agent') || version.agentName.toLowerCase().includes('team') ? 
                          <Bot className="h-5 w-5 text-primary" /> : 
                          <Edit3 className="h-5 w-5 text-accent" />
                        }
                        <span className="font-semibold">{version.agentName}</span>
                        <Badge variant="outline">Version {versions.length - index}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(version.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{version.changeSummary}</p>
                    {/* Placeholder for diff view or content snapshot */}
                    {/* <pre className="text-xs bg-muted/50 p-2 rounded-md max-h-24 overflow-y-auto whitespace-pre-wrap">
                      {version.text.substring(0, 200)}{version.text.length > 200 ? '...' : ''}
                    </pre> */}
                    {index < versions.length -1 && <Separator className="mt-4" />}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
