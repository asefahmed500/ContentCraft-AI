
'use server';

/**
 * @fileOverview Implements the Creative War Room simulation where AI agents debate strategy.
 *
 * - runCreativeWarRoom - A function that initiates and manages the agent debate process based on a brief.
 * - CreativeWarRoomInput - The input type for the runCreativeWarRoom function.
 * - CreativeWarRoomOutput - The return type for the runCreativeWarRoom function, containing the debate log.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CreativeWarRoomInputSchema = z.object({
  brief: z.string().describe('The creative brief that outlines the campaign goals, product/service, and target audience.'),
  title: z.string().describe('The title of the campaign for context.'),
});
export type CreativeWarRoomInput = z.infer<typeof CreativeWarRoomInputSchema>;

const AgentInteractionSchema = z.object({
    agentName: z.string().describe("The name of the AI agent speaking (e.g., 'Director Dave', 'SEO-phie')."),
    agentRole: z.string().describe("The role of the agent, chosen from: 'Creative Director', 'SEO Expert', 'Brand Specialist', 'QA Advisor'."),
    message: z.string().describe("The agent's message, comment, or suggestion in the debate."),
});

const CreativeWarRoomOutputSchema = z.object({
  debateLog: z.array(AgentInteractionSchema).describe('The full transcript of the debate, as a sequence of agent interactions.'),
});
export type CreativeWarRoomOutput = z.infer<typeof CreativeWarRoomOutputSchema>;

export async function runCreativeWarRoom(input: CreativeWarRoomInput): Promise<CreativeWarRoomOutput> {
  return creativeWarRoomFlow(input);
}

const prompt = ai.definePrompt({
  name: 'creativeWarRoomPrompt',
  input: {schema: CreativeWarRoomInputSchema},
  output: {schema: CreativeWarRoomOutputSchema},
  prompt: `You are an orchestrator of a "Creative Strategy War Room". Your task is to simulate a fast-paced, collaborative brainstorming session between four specialized AI agents based on the user's creative brief.

The agents in the war room are:
1.  **Creative Director**: Gives the high-level vision, makes final decisions, and ensures the strategy is compelling and coherent.
2.  **SEO Expert**: Focuses on keywords, search intent, and ranking opportunities to maximize visibility.
3.  **Brand Specialist**: Ensures the messaging aligns with the brand's voice, tone, and values.
4.  **QA Advisor**: Acts as a critical thinker, pointing out potential ambiguities, risks, or inconsistencies in the strategy.

**The Task:**
Generate a debate log of 4-6 sequential interactions. Each agent should build upon or react to the previous statement. The debate should flow logically and result in a refined strategy. The final message MUST be from the Creative Director, summarizing the agreed-upon direction.

**User's Creative Brief:**
- Campaign Title: {{{title}}}
- Brief: {{{brief}}}

**Instructions:**
- Generate a creative, unique name for each agent.
- Ensure the debate is concise, focused, and professional.
- The output must be a JSON object that strictly follows the provided output schema, containing the full 'debateLog'.
- Do not add any commentary outside of the JSON output.

**Example of a good debate sequence:**
1.  Creative Director: "Alright team, based on the brief for 'EcoGlow Skincare', I propose we lead with a 'Luxury Meets Sustainability' angle. Let's highlight the premium, scientifically-backed ingredients first, then reinforce with the eco-friendly packaging."
2.  SEO Expert: "I like that angle. 'Sustainable luxury skincare' is a strong keyword with high search intent. I also recommend we target long-tail keywords like 'vegan retinol alternative' and 'refillable face serum' to capture a specific audience."
3.  Brand Specialist: "Agreed. The tone should be elegant but accessible. We need to avoid overly scientific jargon to maintain our friendly, trustworthy brand voice. Let's use words like 'pure', 'conscious', and 'radiant'."
4.  QA Advisor: "A potential issue: how do we prove the 'scientifically-backed' claims without sounding too clinical and alienating the 'natural' buyer persona? We need to have specific data points or certifications ready to back that up concisely."
5.  Creative Director: "Good point, QA. Let's use a simple infographic or a 'Transparent Sourcing' icon on the site. For the final strategy, we'll lead with the 'Conscious Radiance' tagline, focus content around 'vegan retinol alternative' and 'refillable face serum', and use elegant, accessible language. Motion approved."
`,
});

const creativeWarRoomFlow = ai.defineFlow(
  {
    name: 'creativeWarRoomFlow',
    inputSchema: CreativeWarRoomInputSchema,
    outputSchema: CreativeWarRoomOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
