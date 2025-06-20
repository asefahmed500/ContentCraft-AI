
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
// Removed direct import of BrandVoiceProfile etc. from '@/types/brand' as they are now defined via Zod schemas below
// and the final output type will be inferred. The structures should remain compatible.

const AnalyzeBrandDNAInputSchema = z.object({
  contentDataUri: z
    .string()
    .describe(
      "Content of the brand, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeBrandDNAInput = z.infer<typeof AnalyzeBrandDNAInputSchema>;

const BrandVoiceProfileSchema = z.object({
    tone: z.string().describe('The overall tone of the brand voice (e.g., "playful", "formal", "luxury", "confident", "friendly"). Provide a single dominant tone.'),
    values: z.array(z.string()).describe('Core values expressed or implied in the content (e.g., ["eco-friendly", "innovation"], ["sustainability", "empowerment"]). List 2-3 key values.'),
    languageStyle: z.array(z.string()).describe('Characteristics of the language used (e.g., ["short-form sentences", "uses storytelling", "incorporates industry jargon", "uses slang", "simple vocabulary"]). List 2-3 distinct style elements.'),
    keywords: z.array(z.string()).describe('Frequently used or important brand-specific keywords found in the content. List up to 5 prominent keywords.')
}).describe('The extracted brand voice profile.');

const BrandVisualStyleSchema = z.object({
    colorPalette: z.array(z.string()).describe('Descriptive terms for the visual color palette suggested by the content (e.g., ["soft beige tones", "vibrant primary colors", "natural textures and earthy colors"]). Infer if no images are provided. List 2-3 main color ideas.'),
    fontPreferences: z.array(z.string()).describe('Suggested font styles or types based on the content\'s presentation if applicable (e.g., ["modern sans-serif", "classic serif", "handwritten script"]). Infer if not explicit. List 1-2 preferences.'),
    imageryStyle: z.string().describe('The style of imagery that aligns with the content (e.g., "minimalist photography", "bold graphics", "user-generated content feel"). Provide a concise description.')
}).describe('The inferred brand visual style elements.');

const BrandContentPatternsSchema = z.object({
    commonThemes: z.array(z.string()).describe('Recurring themes or topics found in the content. List 2-3 main themes.'),
    preferredFormats: z.array(z.string()).optional().describe('Content formats that seem to be preferred or align with the style (e.g., ["listicles", "how-to guides", "case studies"]). Infer if applicable.'),
    negativeKeywords: z.array(z.string()).optional().describe('Topics or words the brand seems to avoid, if discernible.')
}).describe('Observed content patterns and themes.');


const AnalyzeBrandDNAOutputSchema = z.object({
  voiceProfile: BrandVoiceProfileSchema,
  visualStyle: BrandVisualStyleSchema,
  contentPatterns: BrandContentPatternsSchema,
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

// The AnalyzeBrandDNAOutput type is now inferred directly from the Zod schema.
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
