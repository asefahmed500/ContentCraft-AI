
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
  voiceProfile: z
    .object({
      tone: z.string().describe('The overall tone of the brand voice (e.g., "playful", "formal", "luxury", "confident").'),
      values: z.array(z.string()).describe('Core values expressed or implied in the content (e.g., ["eco-friendly", "innovation"], ["sustainability", "empowerment"]).'),
      languageStyle: z.array(z.string()).describe('Characteristics of the language used (e.g., ["short-form sentences", "uses storytelling", "incorporates industry jargon", "uses slang"]).'),
      keywords: z.array(z.string()).describe('Frequently used or important brand-specific keywords found in the content.')
    })
    .describe('The extracted brand voice profile.'),
  visualStyle: z
    .object({
        colorPalette: z.array(z.string()).describe('Descriptive terms for the visual color palette suggested by the content (e.g., ["soft beige tones", "vibrant primary colors", "natural textures and earthy colors"]).'),
        fontPreferences: z.array(z.string()).describe('Suggested font styles or types based on the content\'s presentation if applicable (e.g., ["modern sans-serif", "classic serif", "handwritten script"]).'),
        imageryStyle: z.string().describe('The style of imagery that aligns with the content (e.g., "minimalist photography", "bold graphics", "user-generated content feel").')
    }).describe('The inferred brand visual style elements.'),
  contentPatterns: z.object({
        commonThemes: z.array(z.string()).describe('Recurring themes or topics found in the content.'),
        preferredFormats: z.array(z.string()).optional().describe('Content formats that seem to be preferred or align with the style (e.g., ["listicles", "how-to guides", "case studies"]).'),
        negativeKeywords: z.array(z.string()).optional().describe('Topics or words the brand seems to avoid, if discernible.'),
  }).describe('Observed content patterns and themes.'),
  consistencyScore: z
    .number()
    .min(0).max(100)
    .describe(
      'A score (0-100) indicating the consistency of the provided content with generally recognized good branding practices or self-consistency if multiple documents were analyzed.'
    ),
  warnings: z
    .array(z.string())
    .describe(
      'A list of warnings if the content deviates from brand consistency or has potential issues.'
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
  prompt: `You are an expert brand analyst. Analyze the provided brand content.
  Based on the content, extract the following information:
  1.  **Voice Profile**:
      *   **Tone**: Identify the overall tone (e.g., playful, formal, luxury, confident).
      *   **Values**: List core values expressed or implied (e.g., eco-friendly, innovation).
      *   **Language Style**: Describe characteristics of the language used (e.g., short-form, storytelling, slang).
      *   **Keywords**: List frequently used or important brand-specific keywords.
  2.  **Visual Style**:
      *   **Color Palette**: Describe the visual color palette suggested by the content (e.g., soft beige tones, natural textures).
      *   **Font Preferences**: Suggest font styles if discernible.
      *   **Imagery Style**: Describe the style of imagery that aligns with the content.
  3.  **Content Patterns**:
      *   **Common Themes**: Identify recurring themes or topics.
      *   **Preferred Formats**: Suggest content formats that align with the style.
      *   **Negative Keywords**: List topics or words the brand seems to avoid, if discernible.
  4.  **Consistency Score**: Provide a score (0-100) indicating consistency with good branding practices.
  5.  **Warnings**: List any warnings if the content deviates from brand consistency or has potential issues.

  Content for analysis: {{media url=contentDataUri}}

  Ensure your output is a valid JSON object matching the defined output schema.
  Focus on extracting distinct elements for each field. For arrays like 'values' or 'keywords', provide specific examples.
  For 'languageStyle', be descriptive about how the brand communicates.
  For 'visualStyle', infer from textual cues if no actual images are provided; for example, if the text describes a "serene spa experience," colors might be "calming blues and whites."
  `,
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
