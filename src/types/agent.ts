
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
  | 'Visual Content' // This role might be conceptual or for future visual AI
  | 'SEO Optimization'
  | 'Quality Assurance'
  | 'Orchestrator'; // Manages the overall flow and other agents

export interface AgentMessage { // This is suitable for the agentDebates array in Campaign
  agentId: string; // Unique ID for the agent instance if multiple of same role
  agentName: string; // Display name, e.g. "Creative Director Alpha"
  role: AgentRole; // The functional role
  message: string;
  timestamp: Date;
  type: 'statement' | 'question' | 'suggestion' | 'critique' | 'vote_request' | 'vote_cast' | 'summary'; // More granular types
}

// This type might be deprecated or merged if AgentMessage covers the needs
export interface AgentDebate {
  topic: string;
  messages: AgentMessage[];
  conclusion?: string; // Summary of the debate or final decision
  status: 'active' | 'resolved' | 'pending' | 'failed';
}
