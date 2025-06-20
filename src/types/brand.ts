export interface BrandDNA {
  brandId: string;
  voiceProfile: {
    tone: string; // e.g., "formal", "playful", "informative"
    keywords: string[];
    styleGuides: string; // Description of writing style
  };
  visualIdentity: {
    colorPalette: string[]; // Hex codes
    fontPreferences: string[];
    logoUsage: string; // Guidelines
    imageryStyle: string; // e.g., "minimalist", "vibrant", "documentary"
  };
  coreValues: string[];
  targetAudience: string;
  consistencyScore?: number;
  warnings?: string[];
  evolutionHistory?: BrandDNAEvolution[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandDNAEvolution {
  timestamp: Date;
  changes: Partial<BrandDNA>;
  reason: string; // e.g., "Learned from new content upload", "Performance feedback"
}
