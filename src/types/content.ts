

import type { BrandProfile } from './brand';


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
  agentName: string;
  agentRole: string;
  message: string;
  timestamp: Date;
}

export interface ContentVersion {
  id: string; // Could be a simple sequential ID like "v1", "v2" or a UUID
  versionNumber: number; // e.g. 1, 2, 3
  timestamp: Date;
  actorName: string; // e.g., "AI Team", "User Edit", specific agent name like "Creative Director" (maps to modifiedBy)
  changeSummary: string; // Brief description of what changed or what was generated in this version (maps to changes)
  multiFormatContentSnapshot: MultiFormatContent; // A snapshot of all generated formats at this version
  isFlagged?: boolean; // New: For admin moderation of individual content pieces
  adminModerationNotes?: string; // New: Admin notes specific to this content version's moderation status
}

export interface ScheduledPost {
  id: string; // Unique ID for the scheduled post
  campaignId: string;
  contentVersionId?: string; // Which version of content is scheduled
  contentFormat: keyof MultiFormatContent | string; // e.g., 'tweet', 'linkedInArticle'
  platform: string; // e.g., "Twitter", "LinkedIn", "Instagram"
  description?: string; // Strategic note from the AI about this post
  scheduledAt: Date;
  status: 'scheduled' | 'posted' | 'failed' | 'draft';
}

export interface PerformancePrediction {
  ctr?: number;
  engagement?: number;
  conversion?: number;
  audienceMatch?: number;
  openRate?: number; // For email specific
  [key: string]: number | undefined; 
}

export interface ABTestInstance {
  id: string;
  campaignId: string;
  title: string; 
  createdAt: Date;
  aVersionContent: MultiFormatContent;
  bVersionContent: MultiFormatContent;
  aVersionMetrics?: Partial<Record<keyof MultiFormatContent, PerformancePrediction>>;
  bVersionMetrics?: Partial<Record<keyof MultiFormatContent, PerformancePrediction>>;
  formatRecommendations?: Partial<Record<keyof MultiFormatContent, { winner: 'A' | 'B' | 'Tie', reasoning?: string }>>;
  overallWinnerRecommendation?: 'A' | 'B' | 'Inconclusive';
  status: 'draft' | 'predicting' | 'completed' | 'archived';
}


export interface Campaign {
  _id?: any; // MongoDB ObjectId
  id: string; // String representation of _id
  userId: string; // To associate with a user
  title: string; 
  brief: string; // Product or service description
  targetAudience?: string;
  tone?: string;
  contentGoals?: string[];
  brandId?: string; // DEPRECATED in favor of embedded brandProfile. Link to a BrandDNA document (optional) - For future use
  brandProfile?: BrandProfile; // Embedded Brand Profile object
  referenceMaterials?: Array<{ type: 'url' | 'fileId' | 'text'; value: string; name?: string }>; // For uploaded links or file references
  
  agentDebates: AgentInteraction[]; // Stores the history of agent interactions during the debate phase
  contentVersions: ContentVersion[]; // For content evolution timeline and storing different output versions
  scheduledPosts?: ScheduledPost[]; // Array of scheduled posts for this campaign
  abTests?: ABTestInstance[]; // For A/B Testing feature
  
  status: CampaignStatus;
  isPrivate?: boolean; // New field for privacy setting
  isFlagged?: boolean; // For admin content moderation of the overall campaign
  adminModerationNotes?: string; // Notes from admin regarding campaign-level moderation
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

export interface TemplateToken {
  name: string; // e.g., "productName", "targetAudienceBenefit"
  description: string; // e.g., "The name of your product", "The key benefit for the audience"
  defaultValue?: string;
}

export interface ContentTemplate {
  templateId: string;
  title: string;
  description?: string; // A short description of what the template is for
  type: ContentFormat | 'generic' | 'campaignBrief'; // What kind of content this template generates or helps with
  tokens: TemplateToken[]; // Placeholders like {{productName}}
  body: string; // The template string itself with tokens
  // Optional: category: string; tags: string[]; previewImageUrl?: string;
}

export interface UserFeedback {
  campaignId: string;
  contentVersionId?: string; // Optional: if feedback is tied to a specific version
  contentFormat: keyof MultiFormatContent | string; // e.g., 'blogPost', 'tweet'
  rating: 1 | -1; // 1 for positive, -1 for negative
  comment?: string;
  timestamp: Date;
}

export interface CampaignMemory {
  userId?: string; // Or brandId if memory is per-brand
  bestPerformingTone?: string;
  popularCTA?: string;
  successfulTopics?: string[];
  failedTopics?: string[];
  // other learned insights can be added here
  lastUpdatedAt?: Date;
}
