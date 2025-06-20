
'use server';
/**
 * @fileOverview An AI agent that translates content into different languages while preserving tone.
 *
 * - translateContent - A function that handles the content translation process.
 * - TranslateContentInput - The input type for the translateContent function.
 * - TranslateContentOutput - The return type for the translateContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateContentInputSchema = z.object({
  originalContent: z.string().describe('The original content to be translated.'),
  targetLanguage: z.string().describe('The target language for translation (e.g., "Spanish", "French", "Japanese").'),
  originalLanguage: z.string().optional().describe('The language of the original content (e.g., "English"). If not provided, the system may attempt to detect it.'),
  toneDescription: z.string().optional().describe('A description of the desired tone for the translated content (e.g., "formal and respectful", "playful and witty", "technical and precise"). If not provided, the system will attempt to match the tone of the original content.'),
});
export type TranslateContentInput = z.infer<typeof TranslateContentInputSchema>;

const TranslateContentOutputSchema = z.object({
  translatedContent: z.string().describe('The content after translation into the target language.'),
  detectedOriginalLanguage: z.string().optional().describe('The language detected from the original content, if not provided in input.'),
  warnings: z.array(z.string()).optional().describe('Any warnings or notes about the translation process (e.g., "Tone difficult to match exactly", "Some phrases may not have direct equivalents").'),
});
export type TranslateContentOutput = z.infer<typeof TranslateContentOutputSchema>;

export async function translateContent(input: TranslateContentInput): Promise<TranslateContentOutput> {
  return translateContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateContentPrompt',
  input: {schema: TranslateContentInputSchema},
  output: {schema: TranslateContentOutputSchema},
  prompt: `You are an expert multilingual translator. Your task is to translate the provided original content into the specified target language.

Original Content:
---
{{{originalContent}}}
---

Target Language: {{{targetLanguage}}}

{{#if originalLanguage}}
Original Language: {{{originalLanguage}}}
{{/if}}

{{#if toneDescription}}
Desired Tone for Translation: {{{toneDescription}}}
Please make sure the translation accurately reflects this tone.
{{else}}
Please infer the tone from the original content and maintain it as closely as possible in the translation.
{{/if}}

Provide only the translated content. If there are any specific challenges or nuances in the translation (e.g., cultural adaptations made, difficulties matching tone perfectly, phrases without direct equivalents), please include them in the 'warnings' field of the output.
If you automatically detected the original language because it wasn't provided, include it in the 'detectedOriginalLanguage' field.

Ensure the translation is natural, fluent, and accurate for a native speaker of the target language.
Pay attention to context, idioms, and cultural nuances.
If the content involves scripts that require specific directional rendering (e.g., Right-to-Left like Arabic or Hebrew), ensure the translation is appropriate for such rendering, although the structural formatting for RTL is a UI concern.
`,
});

const translateContentFlow = ai.defineFlow(
  {
    name: 'translateContentFlow',
    inputSchema: TranslateContentInputSchema,
    outputSchema: TranslateContentOutputSchema,
  },
  async input => {
    // In a more advanced scenario, you might integrate Google Cloud Translation API here
    // for certain language pairs or as a fallback, then use Gemini for tone re-adaptation.
    // For now, we rely on Gemini for the entire process.
    const {output} = await prompt(input);
    return output!;
  }
);

