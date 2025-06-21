
'use server';
/**
 * @fileOverview An AI agent that generates a content strategy calendar.
 *
 * - generateContentStrategy - A function that handles the content strategy generation.
 * - ContentStrategyInput - The input type for the generateContentStrategy function.
 * - ContentStrategyOutput - The return type for the generateContentStrategy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const ContentStrategyInputSchema = z.object({
  campaignTitle: z.string().describe('The title of the campaign.'),
  campaignBrief: z.string().describe('The creative brief for the campaign, describing the product, service, or topic.'),
  targetAudience: z.string().optional().describe('The target audience for the campaign.'),
  contentGoals: z.array(z.string()).optional().describe('The primary goals of the content (e.g., "drive engagement", "increase sales").'),
});
export type ContentStrategyInput = z.infer<typeof ContentStrategyInputSchema>;

const ScheduledItemSchema = z.object({
    day: z.number().int().min(1).describe('The day in the schedule sequence (e.g., 1 for Day 1).'),
    platform: z.string().describe('The recommended platform for this action (e.g., "Twitter", "Blog", "Instagram", "Email Newsletter").'),
    contentType: z.string().describe('The type of content to be created (e.g., "Teaser Post", "In-depth Article", "Behind-the-Scenes Video Script").'),
    actionDescription: z.string().describe('A brief, strategic description of what this content should achieve and why it is placed on this day.'),
});

export const ContentStrategyOutputSchema = z.object({
  schedule: z.array(ScheduledItemSchema).describe('A 7-day content strategy schedule with 5-7 recommended actions.'),
});
export type ContentStrategyOutput = z.infer<typeof ContentStrategyOutputSchema>;


export async function generateContentStrategy(input: ContentStrategyInput): Promise<ContentStrategyOutput> {
  return contentStrategyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contentStrategyPrompt',
  input: {schema: ContentStrategyInputSchema},
  output: {schema: ContentStrategyOutputSchema},
  prompt: `You are an expert Content Strategist. Your task is to create a 7-day content launch plan based on the provided campaign details.

**Campaign Details:**
- **Title:** {{{campaignTitle}}}
- **Brief:** {{{campaignBrief}}}
{{#if targetAudience}}- **Target Audience:** {{{targetAudience}}}{{/if}}
{{#if contentGoals}}- **Goals:** {{#each contentGoals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}

**Your Task:**
Generate a strategic, day-by-day content schedule for a 7-day launch period.
- Create between 5 and 7 scheduled actions spread across the 7 days. Not every day needs an action, but the sequence should be logical.
- For each action, specify the day, the platform, the type of content, and a clear, concise action description.
- The plan should build momentum. Start with teasers or awareness posts, build to a main content drop (like a blog post), and follow up with engagement or reinforcement posts.
- Example sequence: Day 1 (Instagram Teaser), Day 3 (Main Blog Post), Day 4 (Twitter thread summarizing blog), Day 6 (Email newsletter with results).

Your output must be a valid JSON object matching the defined schema.
`,
});

const contentStrategyFlow = ai.defineFlow(
  {
    name: 'contentStrategyFlow',
    inputSchema: ContentStrategyInputSchema,
    outputSchema: ContentStrategyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
