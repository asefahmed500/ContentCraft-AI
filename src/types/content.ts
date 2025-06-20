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


export interface Campaign {
  id: string;
  brief: string;
  brandProfileId?: string;
  agentDebates?: string[]; // IDs of debates
  contentVersions: ContentPiece[];
  status: 'draft' | 'generating' | 'review' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
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
