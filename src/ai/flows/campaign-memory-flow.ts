
'use server';
/**
 * @fileOverview An AI agent that analyzes a user's campaign history to provide insights.
 *
 * - analyzeCampaignHistory - A function that handles the campaign history analysis.
 * - CampaignMemoryInput - The input type for the analyzeCampaignHistory function.
 * - CampaignMemoryOutput - The return type for the analyzeCampaignHistory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { CampaignMemoryInput, CampaignMemoryOutput, CampaignSummary } from '@/types/memory';

const CampaignSummarySchema = z.object({
  title: z.string().describe("The title of a past campaign."),
  status: z.string().describe("The final or current status of the campaign (e.g., 'published', 'archived')."),
  tone: z.string().optional().describe("The tone of voice used for the campaign."),
  contentFormats: z.array(z.string()).optional().describe("A list of content formats generated in the final version (e.g., ['blogPost', 'tweet']).")
});

const CampaignMemoryInputSchema = z.object({
  pastCampaignsSummary: z.array(CampaignSummarySchema).describe("A summary of the user's most recent campaigns."),
  currentCampaignBrief: z.string().describe("The brief of the new campaign being planned, for context."),
});

const CampaignMemoryOutputSchema = z.object({
  insights: z.array(z.string()).describe("Actionable insights derived from analyzing the patterns in the user's campaign history. Each insight should be a complete sentence."),
  suggestions: z.array(z.string()).describe("Specific, creative suggestions for the new campaign based on past performance and patterns. Each suggestion should be a complete sentence."),
  confidenceScore: z.number().min(0).max(100).describe("A score (0-100) representing the AI's confidence in its analysis based on the amount and clarity of data provided."),
});

export async function analyzeCampaignHistory(input: CampaignMemoryInput): Promise<CampaignMemoryOutput> {
  return campaignMemoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'campaignMemoryPrompt',
  input: {schema: CampaignMemoryInputSchema},
  output: {schema: CampaignMemoryOutputSchema},
  prompt: `You are a brilliant Campaign Strategy Analyst. Your task is to analyze a user's past campaign data to provide intelligent insights and suggestions for their new campaign.

**User's Past Campaign Summaries:**
{{#each pastCampaignsSummary}}
- **Title:** "{{this.title}}"
  - **Status:** {{this.status}}
  {{#if this.tone}}- **Tone:** {{this.tone}}{{/if}}
  {{#if this.contentFormats}}- **Formats:** {{this.contentFormats}}{{#unless @last}}, {{/unless}}{{/if}}
{{/each}}

**New Campaign Brief for Context:**
"{{{currentCampaignBrief}}}"

**Your Analysis Task:**
Based on the historical data, identify patterns and generate 2-3 key **insights**. What tones do they prefer? Are there statuses that indicate success (like 'published')? Do they reuse content formats?
Then, based on your insights and the context of the new campaign brief, provide 2-3 creative **suggestions**. Should they try a new tone? A different content format? Leverage a past success?

Finally, provide a **confidence score** based on how much data you had and how clear the patterns were. More varied data leads to higher confidence.

- Ensure insights are observations based on the data.
- Ensure suggestions are actionable and forward-looking.
- Frame your response to be helpful and strategic.
`,
});

const campaignMemoryFlow = ai.defineFlow(
  {
    name: 'campaignMemoryFlow',
    inputSchema: CampaignMemoryInputSchema,
    outputSchema: CampaignMemoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
