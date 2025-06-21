'use server';
/**
 * @fileOverview An AI agent that reviews flagged content and recommends a moderation action.
 *
 * - reviewFlaggedContent - A function that analyzes flagged content and returns a recommendation.
 * - FlaggedContentReviewInput - The input type for the reviewFlaggedContent function.
 * - FlaggedContentReviewOutput - The return type for the reviewFlaggedContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { BrandProfileSchema } from '@/types/brand';

export const FlaggedContentReviewInputSchema = z.object({
  flaggedContent: z.string().describe('The piece of content that has been flagged and needs to be reviewed.'),
  contentType: z.string().describe('The format of the content (e.g., "blogPost", "tweet").'),
  adminModerationNotes: z.string().optional().describe('Any existing notes from an admin who flagged the content.'),
  brandProfile: BrandProfileSchema.optional().describe('The comprehensive brand profile for the campaign, if it exists. This is crucial for checking brand alignment.'),
});
export type FlaggedContentReviewInput = z.infer<typeof FlaggedContentReviewInputSchema>;

export const FlaggedContentReviewOutputSchema = z.object({
  recommendation: z.enum(['Keep As Is', 'Suggest User Revision', 'Delete Immediately']).describe('The recommended course of action for this piece of content.'),
  justification: z.string().describe('A detailed explanation for the recommendation, referencing the content, brand profile, and any safety concerns.'),
  confidenceScore: z.number().min(0).max(100).describe('A score from 0 to 100 indicating the AI\'s confidence in its recommendation.'),
});
export type FlaggedContentReviewOutput = z.infer<typeof FlaggedContentReviewOutputSchema>;

export async function reviewFlaggedContent(input: FlaggedContentReviewInput): Promise<FlaggedContentReviewOutput> {
  return flagReviewFlow(input);
}

const prompt = ai.definePrompt({
  name: 'flaggedContentReviewPrompt',
  input: {schema: FlaggedContentReviewInputSchema},
  output: {schema: FlaggedContentReviewOutputSchema},
  prompt: `You are a Content Safety and Brand Alignment Moderator for an AI platform. Your task is to review a piece of content that has been flagged and recommend a moderation action.

**Content to Review:**
- **Content Type:** {{{contentType}}}
- **Content:** 
---
{{{flaggedContent}}}
---

{{#if adminModerationNotes}}
**Existing Admin Notes:** "{{{adminModerationNotes}}}"
{{/if}}

{{#if brandProfile}}
**Brand Profile for Alignment Check:**
- **Tone**: {{{brandProfile.voiceProfile.tone}}}
- **Values**: {{#each brandProfile.voiceProfile.values}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- **Keywords**: {{#each brandProfile.voiceProfile.keywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
{{else}}
**Brand Profile:** Not provided for this campaign.
{{/if}}

**Your Task:**
1.  **Analyze the Content**: Review the flagged content for potential issues. Consider:
    *   **Safety Violations**: Is the content harmful, hateful, explicit, or dangerous?
    *   **Brand Misalignment**: (If Brand Profile is provided) Does the content violate the brand's tone, values, or style?
    *   **Quality Issues**: Is the content nonsensical, spammy, or extremely low quality?
2.  **Formulate a Recommendation**: Based on your analysis, choose one of the following actions:
    *   **Keep As Is**: If the flag was likely a mistake and the content is fine.
    *   **Suggest User Revision**: If the content is misaligned with the brand but not a safety risk.
    *   **Delete Immediately**: If the content is a clear safety violation or severe spam.
3.  **Write a Justification**: Clearly explain your reasoning. If it's a brand issue, quote the brand profile. If it's a safety issue, state the category of violation.
4.  **Provide a Confidence Score**: How confident are you in this recommendation? Base this on the clarity of the violation and the data available.

Your output must be a valid JSON object matching the defined schema.
`,
});

const flagReviewFlow = ai.defineFlow(
  {
    name: 'flagReviewFlow',
    inputSchema: FlaggedContentReviewInputSchema,
    outputSchema: FlaggedContentReviewOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
