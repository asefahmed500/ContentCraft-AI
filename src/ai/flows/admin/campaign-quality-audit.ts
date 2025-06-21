'use server';
/**
 * @fileOverview An AI agent that audits the quality and status of a campaign.
 *
 * - auditCampaignQuality - A function that analyzes a campaign and suggests an action.
 * - CampaignQualityAuditInput - The input type for the auditCampaignQuality function.
 * - CampaignQualityAuditOutput - The return type for the auditCampaignQuality function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const CampaignQualityAuditInputSchema = z.object({
  campaignTitle: z.string().describe("The title of the campaign."),
  campaignStatus: z.string().describe("The current status of the campaign (e.g., 'draft', 'published', 'archived')."),
  daysSinceLastUpdate: z.number().int().describe('The number of days since the campaign was last updated.'),
  contentVersionCount: z.number().int().describe('The total number of content versions created for this campaign.'),
  agentDebateCount: z.number().int().describe('The number of agent debate interactions recorded.'),
});
export type CampaignQualityAuditInput = z.infer<typeof CampaignQualityAuditInputSchema>;

export const CampaignQualityAuditOutputSchema = z.object({
  qualityScore: z.number().min(0).max(100).describe('A holistic quality score from 0 to 100, considering all input factors.'),
  justification: z.string().describe('A detailed explanation for the assigned score, referencing the input data and identifying positive or negative signals.'),
  recommendation: z.enum(['Looks Good', 'Suggest Improvement', 'Recommend Archiving', 'Incomplete']).describe('A recommended course of action for the administrator.'),
});
export type CampaignQualityAuditOutput = z.infer<typeof CampaignQualityAuditOutputSchema>;

export async function auditCampaignQuality(input: CampaignQualityAuditInput): Promise<CampaignQualityAuditOutput> {
  return campaignQualityAuditFlow(input);
}

const prompt = ai.definePrompt({
  name: 'campaignQualityAuditPrompt',
  input: {schema: CampaignQualityAuditInputSchema},
  output: {schema: CampaignQualityAuditOutputSchema},
  prompt: `You are a Campaign Quality Auditor AI. Your task is to analyze a campaign's metadata and provide a quality assessment and recommendation.

**Campaign Data to Audit:**
- Campaign Title: "{{{campaignTitle}}}"
- Status: {{{campaignStatus}}}
- Days Since Last Update: {{{daysSinceLastUpdate}}}
- Content Versions: {{{contentVersionCount}}}
- Agent Debates: {{{agentDebateCount}}}

**Auditing Logic & Scoring:**
- **High Quality (80-100):** A complete campaign. It has agent debates, multiple content versions, and is likely in a 'review', 'published', or 'archived' state. Recent updates are a plus.
- **Medium Quality (40-79):** An in-progress or partially complete campaign. It might have debates but few content versions, or vice-versa. It might be a 'draft' that hasn't been updated in a while.
- **Low Quality (0-39):** A stale or incomplete campaign. It might be a 'draft' that's very old with no activity, or a campaign that was started but never generated any content. Campaigns with zero content versions and old update dates are low quality.

**Recommendation Logic:**
- **Looks Good:** For high-quality, active, or appropriately archived campaigns.
- **Suggest Improvement:** For medium-quality campaigns that could be completed. Suggest what's missing (e.g., "The campaign has a debate but no content has been generated.").
- **Recommend Archiving:** For old campaigns (e.g., updated > 90 days ago) that are not published and have low activity.
- **Incomplete:** For new 'draft' campaigns that are clearly just getting started.

**Your Task:**
1.  Calculate a **qualityScore** based on the provided logic.
2.  Write a clear **justification** for your score. Connect the data points.
3.  Provide a single, actionable **recommendation**.

Your output must be a valid JSON object matching the defined schema.
`,
});

const campaignQualityAuditFlow = ai.defineFlow(
  {
    name: 'campaignQualityAuditFlow',
    inputSchema: CampaignQualityAuditInputSchema,
    outputSchema: CampaignQualityAuditOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
