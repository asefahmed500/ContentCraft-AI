
export interface CampaignSummary {
    title: string;
    status: string;
    tone?: string;
    contentFormats?: string[];
}

export interface CampaignMemoryInput {
    pastCampaignsSummary: CampaignSummary[];
    currentCampaignBrief: string;
}

export interface CampaignMemoryOutput {
    insights: string[];
    suggestions: string[];
    confidenceScore: number;
}
