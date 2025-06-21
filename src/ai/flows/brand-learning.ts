
'use server';
/**
 * @fileOverview Brand Profile Extraction AI agent.
 *
 * - analyzeBrandProfile - A function that handles the brand analysis process.
 * - AnalyzeBrandProfileInput - The input type for the analyzeBrandProfile function.
 * - BrandProfile - The return type for the analyzeBrandProfile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { BrandProfileSchema, type BrandProfile } from '@/types/brand';

const AnalyzeBrandProfileInputSchema = z.object({
  contentDataUri: z
    .string()
    .describe(
      "Content of the brand, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeBrandProfileInput = z.infer<typeof AnalyzeBrandProfileInputSchema>;

export type { BrandProfile };


export async function analyzeBrandProfile(
  input: AnalyzeBrandProfileInput
): Promise<BrandProfile> {
  return analyzeBrandProfileFlow(input);
}

const analyzeBrandProfilePrompt = ai.definePrompt({
  name: 'analyzeBrandProfilePrompt',
  input: {schema: AnalyzeBrandProfileInputSchema},
  output: {schema: BrandProfileSchema},
  prompt: `You are an expert brand analyst. Analyze the provided brand content.
  Based on the content, extract the following information:
  1.  **Voice Profile**:
      *   **Tone**: Identify the single dominant overall tone (e.g., playful, formal, luxury, confident, friendly).
      *   **Values**: List 2-3 core values expressed or implied (e.g., eco-friendly, innovation, sustainability, empowerment).
      *   **Language Style**: Describe 2-3 key characteristics of the language used (e.g., short-form sentences, uses storytelling, incorporates industry jargon, uses slang, simple vocabulary).
      *   **Keywords**: List up to 5 prominent brand-specific keywords found in the content.
  2.  **Visual Style (Infer if no images provided based on textual cues, e.g., if text describes a "serene spa," colors might be "calming blues and whites")**:
      *   **Color Palette Ideas**: Describe 2-3 main color palette ideas (e.g., soft beige tones, vibrant primary colors, natural textures and earthy colors).
      *   **Font Preferences**: Suggest 1-2 font styles or types (e.g., modern sans-serif, classic serif).
      *   **Imagery Style**: Describe the style of imagery that aligns with the content (e.g., minimalist photography, bold graphics).
  3.  **Content Patterns**:
      *   **Common Themes**: Identify 2-3 recurring themes or topics.
      *   **Preferred Formats**: (Optional) Suggest content formats that align with the style.
      *   **Negative Keywords**: (Optional) List topics or words the brand seems to avoid.
  4.  **Consistency Score**: Provide a score (0-100) indicating consistency with good branding practices or internal consistency if multiple documents were analyzed.
  5.  **Warnings**: List any warnings if the content deviates from brand consistency or has potential issues.

  Content for analysis: {{media url=contentDataUri}}

  Ensure your output is a valid JSON object matching the defined output schema.
  Focus on extracting distinct elements for each field.
  `,
});

const analyzeBrandProfileFlow = ai.defineFlow(
  {
    name: 'analyzeBrandProfileFlow',
    inputSchema: AnalyzeBrandProfileInputSchema,
    outputSchema: BrandProfileSchema,
  },
  async input => {
    const {output} = await analyzeBrandProfilePrompt(input);
    return output!;
  }
);
