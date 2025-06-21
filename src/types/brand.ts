
import {z} from 'zod';

export const BrandVoiceProfileSchema = z.object({
    tone: z.string().describe('The overall tone of the brand voice (e.g., "playful", "formal", "luxury", "confident", "friendly"). Provide a single dominant tone.'),
    values: z.array(z.string()).describe('Core values expressed or implied in the content (e.g., ["eco-friendly", "innovation"], ["sustainability", "empowerment"]). List 2-3 key values.'),
    languageStyle: z.array(z.string()).describe('Characteristics of the language used (e.g., ["short-form sentences", "uses storytelling", "incorporates industry jargon", "uses slang", "simple vocabulary"]). List 2-3 distinct style elements.'),
    keywords: z.array(z.string()).describe('Frequently used or important brand-specific keywords found in the content. List up to 5 prominent keywords.')
}).describe('The extracted brand voice profile.');
export type BrandVoiceProfile = z.infer<typeof BrandVoiceProfileSchema>;


export const BrandVisualStyleSchema = z.object({
    colorPalette: z.array(z.string()).describe('Descriptive terms for the visual color palette suggested by the content (e.g., ["soft beige tones", "vibrant primary colors", "natural textures and earthy colors"]). Infer if no images are provided. List 2-3 main color ideas.'),
    fontPreferences: z.array(z.string()).describe('Suggested font styles or types based on the content\'s presentation if applicable (e.g., ["modern sans-serif", "classic serif", "handwritten script"]). Infer if not explicit. List 1-2 preferences.'),
    imageryStyle: z.string().describe('The style of imagery that aligns with the content (e.g., "minimalist photography", "bold graphics", "user-generated content feel"). Provide a concise description.')
}).describe('The inferred brand visual style elements.');
export type BrandVisualStyle = z.infer<typeof BrandVisualStyleSchema>;

export const BrandContentPatternsSchema = z.object({
    commonThemes: z.array(z.string()).describe('Recurring themes or topics found in the content. List 2-3 main themes.'),
    preferredFormats: z.array(z.string()).optional().describe('Content formats that seem to be preferred or align with the style (e.g., ["listicles", "how-to guides", "case studies"]). Infer if applicable.'),
    negativeKeywords: z.array(z.string()).optional().describe('Topics or words the brand seems to avoid, if discernible.')
}).describe('Observed content patterns and themes.');
export type BrandContentPatterns = z.infer<typeof BrandContentPatternsSchema>;


// This represents the comprehensive analysis result of a brand's materials.
export const BrandProfileSchema = z.object({
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
export type BrandProfile = z.infer<typeof BrandProfileSchema>;


// This represents a more persistent, database-level model for Brand DNA.
// It is kept for future enhancements involving a dedicated brand management section.
export interface BrandDNA {
  _id?: any; // MongoDB ObjectId
  brandId: string; // String representation of _id, or a user-defined ID for the brand
  userId: string; // Associated user
  sourceMaterialDigest?: string; // A summary or hash of the input material for this DNA version

  voiceProfile: BrandVoiceProfile;
  visualStyle: BrandVisualStyle;
  contentPatterns: BrandContentPatterns;
  
  consistencyScore?: number; // A score (0-100) from the AI analysis
  warnings?: string[]; // Warnings from the AI analysis

  evolutionHistory?: BrandDNAEvolution[]; // History of changes to this BrandDNA
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandDNAEvolution {
  timestamp: Date;
  changes: Partial<Omit<BrandDNA, '_id' | 'brandId' | 'userId' | 'evolutionHistory' | 'createdAt' | 'updatedAt'>>; // What changed
  reason: string; // e.g., "Learned from new content upload: 'annual_report.pdf'", "User feedback on campaign X"
  changedBy: 'user' | 'system'; // Who initiated the change
}
