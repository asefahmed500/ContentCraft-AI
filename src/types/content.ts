

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


export type CampaignStatus = 
  | 'draft' 
  | 'debating' // Orchestrator Agent is working, debate phase
  | 'generating' // Content Writer & Visual Agents are working
  | 'review' // Finalized content ready for user review (maps to "finalized" in some contexts)
  | 'published' 
  | 'archived';

export interface AgentInteraction {
  agent: string; // e.g., "seo-optimizer", "Brand Persona"
  message: string;
  timestamp: Date;
  // Optional: type: 'suggestion', 'critique', 'vote'
}

export interface ContentVersion {
  id: string; // Could be a simple sequential ID like "v1", "v2" or a UUID
  versionNumber: number; // e.g. 1, 2, 3
  timestamp: Date;
  actorName: string; // e.g., "AI Team", "User Edit", specific agent name like "Creative Director" (maps to modifiedBy)
  changeSummary: string; // Brief description of what changed or what was generated in this version (maps to changes)
  multiFormatContentSnapshot: MultiFormatContent; // A snapshot of all generated formats at this version
  // Optional: performanceMetrics?: Record<ContentFormat, { ctr?: number; engagement?: number; conversion?: number; openRate?: number; ctaClick?: number; audienceMatchScore?: number }>;
}

export interface Campaign {
  _id?: any; // MongoDB ObjectId
  id: string; // String representation of _id
  userId: string; // To associate with a user
  title: string; // Campaign name/title from CampaignGenerator
  brief: string; // Product or service description
  targetAudience?: string;
  tone?: string;
  contentGoals?: string[];
  brandId?: string; // Link to a BrandDNA document (optional) - For future use
  referenceMaterials?: Array<{ type: 'url' | 'fileId' | 'text'; value: string; name?: string }>; // For uploaded links or file references
  
  agentDebates: AgentInteraction[]; // Stores the history of agent interactions during the debate phase
  contentVersions: ContentVersion[]; // For content evolution timeline and storing different output versions
  
  status: CampaignStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MultiFormatContent {
  blogPost?: string;
  tweet?: string;
  linkedInArticle?: string;
  instagramPost?: string; // Could be text for carousel
  tiktokScript?: string;
  emailCampaign?: string;
  adsCopy?: string; // E.g. Google Ads copy
  [key: string]: string | undefined; // For additional formats
}

