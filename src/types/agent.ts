
export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  avatar?: string; // URL or path to avatar image
  status?: 'idle' | 'thinking' | 'debating' | 'generating';
}

export type AgentRole = 
  | 'Creative Director'
  | 'Content Writer'
  | 'Brand Persona'
  | 'Analytics Strategist'
  | 'Visual Content' 
  | 'SEO Optimization'
  | 'Quality Assurance'
  | 'Orchestrator';

// This type is for UI representation in AgentDebatePanel
export interface AgentMessage { 
  agentId: string; 
  agentName: string; 
  agentRole: AgentRole; 
  message: string;
  timestamp: Date;
  type: 'statement' | 'question' | 'suggestion' | 'critique' | 'vote_request' | 'vote_cast' | 'summary';
}
