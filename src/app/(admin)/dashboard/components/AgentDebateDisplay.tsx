
"use client";

import type { AgentInteraction } from "@/types/content";
import type { AgentRole } from "@/types/agent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentAvatar } from "@/components/AgentAvatar";
import { formatDistanceToNow } from 'date-fns';

interface AgentDebateDisplayProps {
  debates: AgentInteraction[];
}

export function AgentDebateDisplay({ debates }: AgentDebateDisplayProps) {
  if (!debates || debates.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">
        The debate has not started yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {debates.map((interaction, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 bg-muted/50 border-b">
            <AgentAvatar 
              agent={{ 
                name: interaction.agentName, 
                role: interaction.agent as AgentRole 
              }} 
              size="md"
            />
             <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(interaction.timestamp), { addSuffix: true })}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm whitespace-pre-wrap">
              {interaction.message}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
