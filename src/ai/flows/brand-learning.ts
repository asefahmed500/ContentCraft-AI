'use server';
/**
 * @fileOverview Brand DNA Extraction & Evolution AI agent.
 *
 * - analyzeBrandDNA - A function that handles the brand DNA analysis process.
 * - AnalyzeBrandDNAInput - The input type for the analyzeBrandDNA function.
 * - AnalyzeBrandDNAOutput - The return type for the analyzeBrandDNA function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeBrandDNAInputSchema = z.object({
  contentDataUri: z
    .string()
    .describe(
      "Content of the brand, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeBrandDNAInput = z.infer<typeof AnalyzeBrandDNAInputSchema>;

const AnalyzeBrandDNAOutputSchema = z.object({
  brandProfile: z
    .object({
      voiceProfile: z.string().describe('The brand voice profile.'),
      visualIdentity: z.string().describe('The brand visual identity.'),
      values: z.string().describe('The core values of the brand.'),
    })
    .describe('The extracted brand profile.'),
  consistencyScore: z
    .number()
    .describe(
      'A score indicating the consistency of the provided content with the extracted brand profile.'
    ),
  warnings: z
    .array(z.string())
    .describe(
      'A list of warnings if the content deviates from brand consistency.'
    ),
});
export type AnalyzeBrandDNAOutput = z.infer<typeof AnalyzeBrandDNAOutputSchema>;

export async function analyzeBrandDNA(
  input: AnalyzeBrandDNAInput
): Promise<AnalyzeBrandDNAOutput> {
  return analyzeBrandDNAFlow(input);
}

const analyzeBrandDNAPrompt = ai.definePrompt({
  name: 'analyzeBrandDNAPrompt',
  input: {schema: AnalyzeBrandDNAInputSchema},
  output: {schema: AnalyzeBrandDNAOutputSchema},
  prompt: `You are an expert brand analyst. Analyze the provided brand content and extract its key characteristics.

  Content: {{media url=contentDataUri}}

  Based on the content, determine the brand's voice, visual identity, and core values. Also, provide a consistency score and any warnings if the content deviates from established brand guidelines.
  Make sure the output is in the correct JSON format.`,
});

const analyzeBrandDNAFlow = ai.defineFlow(
  {
    name: 'analyzeBrandDNAFlow',
    inputSchema: AnalyzeBrandDNAInputSchema,
    outputSchema: AnalyzeBrandDNAOutputSchema,
  },
  async input => {
    const {output} = await analyzeBrandDNAPrompt(input);
    return output!;
  }
);
