export interface ContentPiece {
  id: string;
  format: ContentFormat;
  title?: string;
  text: string; // Main content
  visuals?: string[]; // URLs to images/videos
  metadata?: Record<string, any>; // SEO tags, etc.
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ContentFormat = 
  | 'blogPost'
  | 'tweet'
  | 'linkedInArticle'
  | 'instagramPost'
  | 'tiktokScript'
  | 'emailCampaign'
  | 'adsCopy'
  | 'youtubeDescription'
  | 'productDescription'
  | 'twitterThread'
  // Add more as needed up to 15+
  | 'generic';


export type CampaignStatus = 'draft' | 'debating' | 'generating' | 'review' | 'published' | 'archived';

export interface Campaign {
  _id?: any; // MongoDB ObjectId
  id: string;
  brief: string; // Serves as title/main description
  targetAudience?: string;
  tone?: string;
  contentGoals?: string[];
  brandProfileId?: string; // Link to a BrandDNA document
  agentDebates?: string[]; // IDs of debates (or embedded debate summaries)
  contentVersions: ContentPiece[]; // For content evolution timeline
  status: CampaignStatus;
  createdAt: Date;
  updatedAt: Date;
  userId: string; // To associate with a user
}

export interface MultiFormatContent {
  blogPost?: string;
  tweet?: string;
  linkedInArticle?: string;
  instagramPost?: string;
  tiktokScript?: string;
  emailCampaign?: string;
  adsCopy?: string;
  [key: string]: string | undefined; // For additional formats
}

