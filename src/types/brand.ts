
export interface BrandVoiceProfile {
  tone: string; // e.g., "playful", "luxury", "confident"
  values: string[]; // e.g., ["eco-friendly", "empowering"], ["sustainability", "minimalism"]
  languageStyle: string[]; // e.g., ["short-form", "storytelling", "uses slang"]
  keywords: string[]; // Important brand keywords
}

export interface BrandVisualStyle {
  colorPalette: string[]; // Descriptive e.g., ["soft beige", "deep forest green"] or hex codes
  fontPreferences: string[]; // Font names or styles
  imageryStyle: string; // e.g., "minimalist photos", "vibrant illustrations", "natural textures"
}

export interface BrandContentPatterns {
  commonThemes: string[];
  preferredFormats?: string[]; // e.g., "listicles", "how-to guides"
  negativeKeywords?: string[]; // Topics or words to avoid
}

export interface BrandDNA {
  _id?: any; // MongoDB ObjectId
  brandId: string; // String representation of _id, or a user-defined ID
  userId: string; // Associated user
  sourceMaterialDigest?: string; // A summary or hash of the input material for this DNA version

  voiceProfile: BrandVoiceProfile;
  visualStyle: BrandVisualStyle;
  contentPatterns: BrandContentPatterns;
  
  evolutionHistory?: BrandDNAEvolution[]; // History of changes to this BrandDNA
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandDNAEvolution {
  timestamp: Date;
  changes: Partial<Omit<BrandDNA, '_id' | 'brandId' | 'userId' | 'evolutionHistory' | 'createdAt' | 'updatedAt'>>; // What changed in voice, visual, or patterns
  reason: string; // e.g., "Learned from new content upload: 'annual_report.pdf'", "User feedback on campaign X"
  changedBy: 'user' | 'system'; // Who initiated the change
}
