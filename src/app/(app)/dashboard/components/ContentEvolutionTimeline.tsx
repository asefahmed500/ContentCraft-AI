
"use client";

import type { ContentVersion } from '@/types/content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Bot, Edit3, Clock, Eye, GitCompareArrows, History, User } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface ContentEvolutionTimelineProps {
  versions: ContentVersion[];
  onViewVersion?: (version: ContentVersion) => void; // Callback to handle viewing a specific version's content
}

export function ContentEvolutionTimeline({ versions, onViewVersion }: ContentEvolutionTimelineProps) {

  const sortedVersions = versions.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getActorIcon = (actorName: string) => {
    const lowerActorName = actorName.toLowerCase();
    if (lowerActorName.includes('ai') || lowerActorName.includes('system') || lowerActorName.includes('agent') || lowerActorName.includes('team')) {
      return <Bot className="h-5 w-5 text-primary" />;
    }
    if (lowerActorName.includes('user')) {
      return <User className="h-5 w-5 text-accent" />;
    }
    return <Edit3 className="h-5 w-5 text-muted-foreground" />;
  };


  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Content Evolution Timeline
        </CardTitle>
        <CardDescription>
          Track how your content has changed and evolved throughout the creative process.
          {sortedVersions.length === 0 && " No versions yet for the selected campaign."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        {sortedVersions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Clock size={48} className="mb-4" />
            <p>No content versions available for this campaign yet.</p>
            <p className="text-sm">Generate content to see its evolution here.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] w-full pr-4">
            <div className="relative pl-6">
              {/* Timeline Line */}
              <div className="absolute left-[0.55rem] top-0 bottom-0 w-0.5 bg-border -z-10"></div>

              {sortedVersions.map((version, index) => (
                <div key={version.id || `version-${index}`} className="mb-6 relative"> {/* Use index as fallback key if id is missing */}
                  {/* Dot on the timeline */}
                  <div className={`absolute left-0 top-1 h-5 w-5 rounded-full border-4 border-background ring-2 ${version.actorName.toLowerCase().includes('ai') || version.actorName.toLowerCase().includes('system') ? 'ring-primary bg-primary/50' : 'ring-accent bg-accent/50'}`}></div>
                  
                  <div className="ml-8"> {/* Increased margin to not overlap with the larger dot */}
                    <div className="flex items-center justify-between mb-1 flex-wrap">
                      <div className="flex items-center gap-2">
                        {getActorIcon(version.actorName)}
                        <span className="font-semibold">{version.actorName}</span>
                        <Badge variant="outline">Version {version.versionNumber || sortedVersions.length - index}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap" title={format(new Date(version.timestamp), "PPPppp")}>
                        {formatDistanceToNow(new Date(version.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">{version.changeSummary}</p>
                    
                    <div className="space-x-2 mt-2 flex flex-wrap gap-2">
                       {onViewVersion && (
                         <Button variant="outline" size="sm" onClick={() => onViewVersion(version)}>
                           <Eye className="mr-1 h-3.5 w-3.5" /> View Snapshot
                         </Button>
                       )}
                        <Button variant="outline" size="sm" disabled>
                           <GitCompareArrows className="mr-1 h-3.5 w-3.5" /> Compare (Soon)
                        </Button>
                         <Button variant="outline" size="sm" disabled>
                           <History className="mr-1 h-3.5 w-3.5" /> Revert (Soon)
                        </Button>
                    </div>
                    {index < sortedVersions.length -1 && <Separator className="mt-6" />}
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
