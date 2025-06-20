

export interface BrandVoiceProfile {
  tone: string; // e.g., "playful", "luxury", "confident", "friendly", "formal"
  values: string[]; // e.g., ["eco-friendly", "empowering"], ["sustainability", "minimalism", "innovation"]
  languageStyle: string[]; // e.g., ["short-form sentences", "uses storytelling", "incorporates industry jargon", "uses slang", "simple vocabulary"]
  keywords: string[]; // Important brand keywords
}

export interface BrandVisualStyle {
  colorPalette: string[]; // Descriptive e.g., ["soft beige tones", "vibrant primary colors", "natural textures and earthy colors"] or hex codes
  fontPreferences: string[]; // Font names or styles e.g., ["modern sans-serif", "classic serif", "handwritten script"]
  imageryStyle: string; // e.g., "minimalist photography", "bold graphics", "user-generated content feel"
}

export interface BrandContentPatterns {
  commonThemes: string[]; // Recurring themes or topics found in the content
  preferredFormats?: string[]; // Content formats that seem to be preferred or align with the style (e.g., ["listicles", "how-to guides", "case studies"])
  negativeKeywords?: string[]; // Topics or words the brand seems to avoid, if discernible
}

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

