"use client";

import type { AgentMessage } from '@/types/agent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgentAvatar } from '@/components/AgentAvatar';
import { Bot, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AgentDebatePanelProps {
  debateMessages: AgentMessage[];
  isDebating: boolean;
  debateTopic?: string;
}

const mockAgents = {
  'agent-cd': { id: 'agent-cd', name: 'Creative Director', role: 'Creative Director' as const },
  'agent-cw': { id: 'agent-cw', name: 'Content Writer', role: 'Content Writer' as const },
  'agent-bp': { id: 'agent-bp', name: 'Brand Persona', role: 'Brand Persona' as const },
};

export function AgentDebatePanel({ debateMessages, isDebating, debateTopic }: AgentDebatePanelProps) {
  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Creative War Room
        </CardTitle>
        {debateTopic && <CardDescription>Topic: {debateTopic}</CardDescription>}
        {!debateTopic && !isDebating && <CardDescription>Agents are standing by. Start a campaign to initiate a debate.</CardDescription>}
        {isDebating && <CardDescription className="text-primary animate-pulse">Agents are currently debating...</CardDescription>}
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-[400px] p-4">
          {debateMessages.length === 0 && !isDebating && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bot size={48} className="mb-4" />
              <p>No debate messages yet.</p>
            </div>
          )}
          <div className="space-y-4">
            {debateMessages.map((msg, index) => (
              <div key={index} className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[75%] p-3 rounded-lg shadow ${index % 2 === 0 ? 'bg-secondary text-secondary-foreground rounded-tl-none' : 'bg-primary text-primary-foreground rounded-tr-none'}`}>
                  <div className="flex items-center gap-2 mb-1">
                     <AgentAvatar agent={mockAgents[msg.agentId as keyof typeof mockAgents] || { id: msg.agentId, name: msg.agentName, role: msg.agentRole }} size="sm" />
                     <div>
                        <span className="font-semibold text-sm">{msg.agentName}</span>
                        <span className="text-xs ml-2 text-muted-foreground">{formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}</span>
                     </div>
                  </div>
                  <p className="text-sm">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
