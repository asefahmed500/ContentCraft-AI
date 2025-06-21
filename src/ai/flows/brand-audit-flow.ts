
'use server';
/**
 * @fileOverview A brand alignment audit AI agent.
 *
 * - auditContentAgainstBrand - A function that handles the brand alignment check.
 * - BrandAuditInput - The input type for the auditContentAgainstBrand function.
 * - BrandAuditOutput - The return type for the auditContentAgainstBrand function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { BrandProfileSchema } from '@/types/brand';

export const BrandAuditInputSchema = z.object({
  contentToCheck: z.string().describe('The piece of content that needs to be audited for brand alignment.'),
  brandProfile: BrandProfileSchema.describe('The comprehensive brand profile to audit the content against.'),
});
export type BrandAuditInput = z.infer<typeof BrandAuditInputSchema>;

export const BrandAuditOutputSchema = z.object({
  alignmentScore: z.number().min(0).max(100).describe('A score from 0 to 100 indicating how well the content aligns with the brand profile. 100 is perfect alignment.'),
  justification: z.string().describe('A detailed explanation of why the score was given, highlighting both positive and negative aspects of the alignment.'),
  suggestions: z.array(z.string()).describe('A list of concrete, actionable suggestions for improving the content\'s brand alignment.'),
});
export type BrandAuditOutput = z.infer<typeof BrandAuditOutputSchema>;

export async function auditContentAgainstBrand(input: BrandAuditInput): Promise<BrandAuditOutput> {
  return brandAuditFlow(input);
}

const prompt = ai.definePrompt({
  name: 'brandAuditPrompt',
  input: {schema: BrandAuditInputSchema},
  output: {schema: BrandAuditOutputSchema},
  prompt: `You are an expert Brand Strategist and Auditor. Your task is to analyze a piece of content and score its alignment with a given Brand Profile.

**Brand Profile to Audit Against:**
- **Tone**: {{{brandProfile.voiceProfile.tone}}}
- **Values**: {{#each brandProfile.voiceProfile.values}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- **Language Style**: {{#each brandProfile.voiceProfile.languageStyle}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- **Keywords**: {{#each brandProfile.voiceProfile.keywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- **Common Themes**: {{#each brandProfile.contentPatterns.commonThemes}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

**Content to Check:**
---
{{{contentToCheck}}}
---

**Your Task:**
1.  **Analyze and Score**: Carefully compare the "Content to Check" against every aspect of the "Brand Profile". Assign an **alignmentScore** from 0 (completely off-brand) to 100 (perfectly on-brand).
2.  **Justify the Score**: Provide a comprehensive **justification**. Explain your reasoning clearly. Mention what the content does well (e.g., "The use of the keyword 'sustainability' was excellent") and where it falls short (e.g., "The tone felt more formal than the brand's 'playful' voice").
3.  **Provide Suggestions**: Offer 2-3 specific, actionable **suggestions** for how to improve the content to better align with the brand. For example, instead of just saying "change the tone," suggest specific phrases or rewordings.

Your output must be a valid JSON object matching the defined schema.
`,
});

const brandAuditFlow = ai.defineFlow(
  {
    name: 'brandAuditFlow',
    inputSchema: BrandAuditInputSchema,
    outputSchema: BrandAuditOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
