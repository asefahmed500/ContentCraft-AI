
"use client";

import type { AgentInteraction } from "@/types/content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentAvatar } from "@/components/AgentAvatar";
import { formatDistanceToNow } from 'date-fns';
import type { AgentRole } from "@/types/agent";

interface AgentDebateDisplayProps {
  debates: AgentInteraction[];
}

export function AgentDebateDisplay({ debates }: AgentDebateDisplayProps) {
  if (!debates || debates.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4 text-sm">
        The debate has not started yet.
      </p>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
      {debates.map((interaction, index) => (
        <div key={index} className="flex items-start gap-3">
          <AgentAvatar 
            agent={{ 
              name: interaction.agentName, 
              role: interaction.agentRole as AgentRole 
            }} 
            size="sm"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{interaction.agentName}</p>
                <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(interaction.timestamp), { addSuffix: true })}
                </p>
            </div>
            <div className="text-sm p-3 rounded-md bg-muted/80 mt-1">
                {interaction.message}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
