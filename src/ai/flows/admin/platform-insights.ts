'use server';
/**
 * @fileOverview An AI agent that analyzes platform-wide statistics to generate insights.
 *
 * - getPlatformInsights - A function that analyzes platform data and returns a summary.
 * - PlatformInsightsInput - The input type for the getPlatformInsights function.
 * - PlatformInsightsOutput - The return type for the getPlatformInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const PlatformInsightsInputSchema = z.object({
  totalUsers: z.number().describe('The total number of registered users on the platform.'),
  totalCampaigns: z.number().describe('The total number of campaigns created on the platform.'),
  activeUsersToday: z.number().describe('The number of users who have been active today (mocked data).'),
  campaignsCreatedToday: z.number().describe('The number of new campaigns created today (mocked data).'),
});
export type PlatformInsightsInput = z.infer<typeof PlatformInsightsInputSchema>;

export const PlatformInsightsOutputSchema = z.object({
  summary: z.string().describe('A concise, natural language summary of the platform\'s current state and recent trends. This should be 1-2 sentences.'),
  keyObservations: z.array(z.string()).describe('A list of 2-3 bullet-point observations about the data. For example, "User growth is outpacing campaign creation, suggesting high user retention but a need to encourage more content creation."'),
});
export type PlatformInsightsOutput = z.infer<typeof PlatformInsightsOutputSchema>;

export async function getPlatformInsights(input: PlatformInsightsInput): Promise<PlatformInsightsOutput> {
  return platformInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'platformInsightsPrompt',
  input: {schema: PlatformInsightsInputSchema},
  output: {schema: PlatformInsightsOutputSchema},
  prompt: `You are a sharp and concise Platform Analyst. Your task is to analyze the following key metrics and provide a brief, insightful summary for a busy platform administrator.

**Current Platform Metrics:**
- Total Users: {{{totalUsers}}}
- Total Campaigns: {{{totalCampaigns}}}
- Active Users Today: {{{activeUsersToday}}}
- Campaigns Created Today: {{{campaignsCreatedToday}}}

**Instructions:**
1.  Generate a one-sentence **summary** of the overall platform health.
2.  Provide 2-3 bulleted **keyObservations**. These should be insightful takeaways, not just a restatement of the numbers. Identify trends, potential opportunities, or areas of concern. Be direct and analytical.

Example Output:
- Summary: The platform shows healthy user engagement, though the rate of new campaign creation is moderate.
- Key Observations:
    - "The ratio of campaigns to users is approximately 1:5, indicating an opportunity to prompt new users to create their first campaign."
    - "Daily activity is strong, with nearly 20% of the user base active today, suggesting good short-term retention."

Your output must be a valid JSON object matching the defined schema.
`,
});

const platformInsightsFlow = ai.defineFlow(
  {
    name: 'platformInsightsFlow',
    inputSchema: PlatformInsightsInputSchema,
    outputSchema: PlatformInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
