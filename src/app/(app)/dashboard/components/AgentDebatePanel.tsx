
"use client";

import type { AgentMessage } from '@/types/agent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgentAvatar } from '@/components/AgentAvatar';
import { Bot, Users, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AgentDebatePanelProps {
  debateMessages: AgentMessage[];
  isDebating: boolean;
  debateTopic?: string;
}

export function AgentDebatePanel({ debateMessages, isDebating, debateTopic }: AgentDebatePanelProps) {
  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Creative War Room
        </CardTitle>
        {debateTopic && <CardDescription>Topic: {debateTopic}</CardDescription>}
        {!debateTopic && !isDebating && <CardDescription>No active campaign debate. Select or create a campaign to begin.</CardDescription>}
        {isDebating && (
            <CardDescription className="text-primary flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Agents are currently debating...
            </CardDescription>
        )}
         {!isDebating && debateTopic && debateMessages.length > 0 && (
            <CardDescription className="text-green-600">Debate concluded. Review messages below.</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-[400px] p-4">
          {debateMessages.length === 0 && !isDebating && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bot size={48} className="mb-4" />
              <p>No debate messages yet.</p>
              <p className="text-sm">Start a campaign or select an existing one to see agent discussions.</p>
            </div>
          )}
           {debateMessages.length === 0 && isDebating && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Loader2 size={48} className="mb-4 animate-spin text-primary" />
              <p>Agents are warming up...</p>
            </div>
          )}
          <div className="space-y-4">
            {debateMessages.map((msg, index) => (
              <div key={index} className={`flex ${msg.agentRole === 'Orchestrator' || index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div 
                    className={`max-w-[85%] p-3 rounded-lg shadow ${
                        msg.agentRole === 'Orchestrator' 
                            ? 'bg-muted text-muted-foreground rounded-tl-none rounded-tr-none w-full' 
                            : (index % 2 === 0 
                                ? 'bg-secondary text-secondary-foreground rounded-tl-none' 
                                : 'bg-primary text-primary-foreground rounded-tr-none')
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                     <AgentAvatar agent={{ id: msg.agentId, name: msg.agentName, role: msg.agentRole, avatar: undefined }} size="sm" />
                     <div>
                        <span className="font-semibold text-sm">{msg.agentName}</span>
                        {msg.timestamp && (
                            <span className="text-xs ml-2 text-muted-foreground/80">{formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}</span>
                        )}
                     </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
