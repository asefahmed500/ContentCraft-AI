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
  prompt: `You are an expert content creation agent. Your task is to generate content in multiple formats based on the provided creative brief and brand voice.

**Creative Brief / Input Content:**
{{{inputContent}}}

{{#if brandVoice}}
**Brand Voice to adhere to:**
{{{brandVoice}}}
{{/if}}

**Your Task:**
Generate content for each of the following formats, ensuring it is tailored for the platform and aligns with the brief and brand voice.

- blogPost: A comprehensive blog post.
- tweet: A short, engaging tweet with relevant hashtags.
- linkedInArticle: A professional article suitable for LinkedIn.
- instagramPost: A compelling caption for an Instagram post.
- tiktokScript: A short video script for a TikTok video.
- emailCampaign: A marketing email to a customer list.
- adsCopy: A short, punchy copy for online advertisements.
`,
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
