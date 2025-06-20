'use server';

/**
 * @fileOverview Implements the agent debate flow for the Creative War Room Simulation.
 *
 * - agentDebate - A function that initiates and manages the agent debate process.
 * - AgentDebateInput - The input type for the agentDebate function.
 * - AgentDebateOutput - The return type for the agentDebate function, containing the debate summary and content suggestions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AgentDebateInputSchema = z.object({
  topic: z.string().describe('The topic of the debate.'),
  initialContent: z.string().describe('The initial content to be debated.'),
  agentRoles: z.array(z.string()).describe('The roles of the agents participating in the debate.'),
});
export type AgentDebateInput = z.infer<typeof AgentDebateInputSchema>;

const AgentDebateOutputSchema = z.object({
  debateSummary: z.string().describe('A summary of the debate, including key arguments and decisions.'),
  contentSuggestions: z.array(z.string()).describe('A list of content suggestions resulting from the debate.'),
});
export type AgentDebateOutput = z.infer<typeof AgentDebateOutputSchema>;

export async function agentDebate(input: AgentDebateInput): Promise<AgentDebateOutput> {
  return agentDebateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'agentDebatePrompt',
  input: {schema: AgentDebateInputSchema},
  output: {schema: AgentDebateOutputSchema},
  prompt: `You are facilitating a debate between several AI agents to improve the provided content.

The topic of the debate is: {{{topic}}}

The initial content is: {{{initialContent}}}

The participating agents have the following roles: {{#each agentRoles}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Each agent will provide their perspective and argue for their suggestions.
Your task is to summarize the debate, highlighting key arguments and decisions, and to provide a list of content suggestions that resulted from the debate.

Format the debate summary and content suggestions clearly and concisely.

Debate Summary:

Content Suggestions:`, // Ensure the prompt guides the model to create the expected output
});

const agentDebateFlow = ai.defineFlow(
  {
    name: 'agentDebateFlow',
    inputSchema: AgentDebateInputSchema,
    outputSchema: AgentDebateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
