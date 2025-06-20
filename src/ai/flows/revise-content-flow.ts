'use server';
/**
 * @fileOverview An AI agent that revises content based on specific instructions.
 *
 * - reviseContent - A function that handles the content revision process.
 * - ReviseContentInput - The input type for the reviseContent function.
 * - ReviseContentOutput - The return type for the reviseContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ReviseContentInputSchema = z.object({
  originalContent: z.string().describe('The original content to be revised.'),
  contentType: z.string().optional().describe('The type or format of the content (e.g., "blog post", "tweet", "advertisement copy").'),
  revisionInstructions: z.string().describe('Specific instructions for how the content should be revised (e.g., "Make this more persuasive for Gen Z", "Improve clarity and conciseness", "Optimize for SEO keywords: sustainable, eco-friendly").'),
  targetAudience: z.string().optional().describe('The intended audience for the revised content.'),
  desiredTone: z.string().optional().describe('The desired tone for the revised content (e.g., "formal", "playful", "empathetic").'),
});
export type ReviseContentInput = z.infer<typeof ReviseContentInputSchema>;

const ReviseContentOutputSchema = z.object({
  revisedContent: z.string().describe('The revised content after applying the instructions.'),
  suggestions: z.array(z.string()).optional().describe('Specific suggestions or comments on the revisions made, or alternative phrasings.'),
  explanation: z.string().optional().describe('An explanation of the key changes made and why.'),
});
export type ReviseContentOutput = z.infer<typeof ReviseContentOutputSchema>;

export async function reviseContent(input: ReviseContentInput): Promise<ReviseContentOutput> {
  return reviseContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'reviseContentPrompt',
  input: {schema: ReviseContentInputSchema},
  output: {schema: ReviseContentOutputSchema},
  prompt: `You are an expert content editor and reviser. Your task is to revise the provided original content based on the given instructions.

Original Content to Revise:
---
{{{originalContent}}}
---

{{#if contentType}}
Content Type/Format: {{{contentType}}}
{{/if}}

Revision Instructions:
---
{{{revisionInstructions}}}
---

{{#if targetAudience}}
Target Audience for Revision: {{{targetAudience}}}
{{/if}}

{{#if desiredTone}}
Desired Tone for Revision: {{{desiredTone}}}
{{/if}}

Please provide the fully revised content. 
Optionally, you can also provide a list of specific suggestions or alternative phrasings, and an explanation of the key changes you made.

Focus on directly addressing the revision instructions.
If the instructions ask for multiple things (e.g., improve clarity AND make it persuasive), ensure both aspects are addressed in the revised content.
If SEO keywords are provided, try to naturally integrate them.
Ensure the revised content is complete and ready to use.
`,
});

const reviseContentFlow = ai.defineFlow(
  {
    name: 'reviseContentFlow',
    inputSchema: ReviseContentInputSchema,
    outputSchema: ReviseContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
