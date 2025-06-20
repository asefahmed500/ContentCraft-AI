'use server';
/**
 * @fileOverview A content generation AI agent that generates content in multiple formats from a single input.
 *
 * - generateContent - A function that handles the content generation process.
 * - GenerateContentInput - The input type for the generateContent function.
 * - GenerateContentOutput - The return type for the generateContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateContentInputSchema = z.object({
  inputContent: z
    .string()
    .describe('The input content to be used for generating content in multiple formats.'),
  brandVoice: z.string().optional().describe('The brand voice to be used for content generation.'),
});
export type GenerateContentInput = z.infer<typeof GenerateContentInputSchema>;

const GenerateContentOutputSchema = z.object({
  blogPost: z.string().describe('The generated blog post content.'),
  tweet: z.string().describe('The generated tweet content.'),
  linkedInArticle: z.string().describe('The generated LinkedIn article content.'),
  instagramPost: z.string().describe('The generated Instagram post content.'),
  tiktokScript: z.string().describe('The generated TikTok script content.'),
  emailCampaign: z.string().describe('The generated email campaign content.'),
  adsCopy: z.string().describe('The generated ads copy content.'),
});
export type GenerateContentOutput = z.infer<typeof GenerateContentOutputSchema>;

export async function generateContent(input: GenerateContentInput): Promise<GenerateContentOutput> {
  return generateContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateContentPrompt',
  input: {schema: GenerateContentInputSchema},
  output: {schema: GenerateContentOutputSchema},
  prompt: `You are a content creation expert. Generate content in multiple formats based on the input content and brand voice provided.

Input Content: {{{inputContent}}}
Brand Voice: {{{brandVoice}}}

Output the content in the following formats:
- blogPost: A blog post based on the input content.
- tweet: A tweet based on the input content.
- linkedInArticle: A LinkedIn article based on the input content.
- instagramPost: An Instagram post based on the input content.
- tiktokScript: A TikTok script based on the input content.
- emailCampaign: An email campaign based on the input content.
- adsCopy: Ads copy based on the input content.

{{#if brandVoice}}
Ensure that the generated content aligns with the specified brand voice.
{{/if}}`,
});

const generateContentFlow = ai.defineFlow(
  {
    name: 'generateContentFlow',
    inputSchema: GenerateContentInputSchema,
    outputSchema: GenerateContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
