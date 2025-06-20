
"use client";

import type { ContentTemplate, ContentFormat } from '@/types/content';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Library, Sparkles, FileText, Users, ShoppingBag } from 'lucide-react';

const mockTemplates: ContentTemplate[] = [
  {
    templateId: "tpl_prod_launch_01",
    title: "Product Launch Announcement",
    description: "A comprehensive template for announcing a new product across multiple channels.",
    type: "campaignBrief",
    tokens: [
      { name: "productName", description: "Name of the new product", defaultValue: "Our New Gadget X" },
      { name: "keyFeature", description: "The most exciting feature", defaultValue: "AI-powered smart suggestions" },
      { name: "launchDate", description: "Official launch date", defaultValue: "Next Monday" },
      { name: "targetAudience", description: "Who is this product for?", defaultValue: "Tech Enthusiasts" },
    ],
    body: "Announcing {{productName}}! Get ready for {{keyFeature}}. Launching {{launchDate}} for {{targetAudience}}.",
  },
  {
    templateId: "tpl_sales_promo_01",
    title: "Limited-Time Sales Promotion Email",
    description: "Email template for a seasonal sales campaign.",
    type: "emailCampaign",
    tokens: [
      { name: "discountPercentage", description: "Percentage off", defaultValue: "25%" },
      { name: "promoCode", description: "Discount code", defaultValue: "SALE25" },
      { name: "endDate", description: "When the promotion ends", defaultValue: "end of this week" },
      { name: "productCategory", description: "Category of products on sale", defaultValue: "all summer items" }
    ],
    body: "Get {{discountPercentage}} off {{productCategory}} with code {{promoCode}}! Offer ends {{endDate}}.",
  },
  {
    templateId: "tpl_thought_leader_li_01",
    title: "Thought Leadership LinkedIn Post",
    description: "A structure for a thought-provoking LinkedIn article.",
    type: "linkedInArticle",
    tokens: [
      { name: "industryTrend", description: "A current trend in your industry", defaultValue: "the rise of AI in marketing" },
      { name: "coreArgument", description: "Your main point or perspective", defaultValue: "AI will augment, not replace, human creativity" },
      { name: "callToAction", description: "What you want readers to do", defaultValue: "Share your thoughts in the comments!" },
    ],
    body: "Let's talk about {{industryTrend}}. My take: {{coreArgument}}. What do you think? {{callToAction}}",
  },
  {
    templateId: "tpl_tiktok_challenge_01",
    title: "TikTok Trend Engagement",
    description: "Template for participating in a trending TikTok challenge related to your brand.",
    type: "tiktokScript",
    tokens: [
      { name: "trendName", description: "Name of the TikTok trend/challenge", defaultValue: "#CoolBrandChallenge" },
      { name: "brandAngle", description: "How your brand participates uniquely", defaultValue: "showcasing our product's versatility" },
      { name: "soundUsed", description: "Trending sound or music", defaultValue: "Original Sound - @Creator" },
    ],
    body: "Jumping on the {{trendName}}! Here's our take, {{brandAngle}}. Sound: {{soundUsed}} #fyp",
  },
];

const typeIcons: Record<ContentTemplate['type'], React.ElementType> = {
    campaignBrief: Library,
    emailCampaign: FileText,
    linkedInArticle: Users,
    tiktokScript: Sparkles,
    adsCopy: ShoppingBag,
    blogPost: FileText,
    tweet: Sparkles,
    instagramPost: Sparkles,
    youtubeDescription: FileText,
    productDescription: ShoppingBag,
    twitterThread: Sparkles,
    generic: FileText,
};


export function TemplateLibrary() {
  const { toast } = useToast();

  const handleUseTemplate = (template: ContentTemplate) => {
    // In a real scenario, this would likely:
    // 1. Open the CampaignGenerator form
    // 2. Pre-fill fields based on the template (e.g., brief, possibly title)
    // 3. Or, provide the template's body and tokens to an AI for guided content generation.
    toast({
      title: "Template Selected (Simulated)",
      description: `"${template.title}" would now be used to guide new content generation or pre-fill a campaign brief. Full integration is a next step.`,
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Library className="h-6 w-6 text-primary" />
          Content Template Library
        </CardTitle>
        <CardDescription>
          Kickstart your content creation with ready-made templates. Select a template to guide your campaign brief or inspire AI generation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mockTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileText size={48} className="mb-4" />
            <p>No templates available yet.</p>
            <p className="text-sm">Check back soon for new templates!</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockTemplates.map((template) => {
                const IconComponent = typeIcons[template.type] || FileText;
                return (
                <Card key={template.templateId} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="font-headline text-lg">{template.title}</CardTitle>
                        <Badge variant="outline" className="capitalize flex items-center gap-1">
                            <IconComponent className="h-3.5 w-3.5" /> 
                            {template.type.replace(/([A-Z])/g, ' $1').trim()}
                        </Badge>
                    </div>
                    {template.description && <CardDescription className="text-xs pt-1">{template.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3 text-sm">
                    <p className="font-semibold text-muted-foreground">Key Placeholders:</p>
                    {template.tokens.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-xs">
                        {template.tokens.slice(0, 3).map(token => ( // Show up to 3 tokens
                            <li key={token.name}>
                                <span className="font-medium text-primary/90">&#123;&#123;{token.name}&#125;&#125;:</span> {token.description}
                            </li>
                        ))}
                        {template.tokens.length > 3 && <li>...and more</li>}
                        </ul>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">No specific placeholders defined.</p>
                    )}
                    
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleUseTemplate(template)}
                    >
                      <Sparkles className="mr-2 h-4 w-4" /> Use Template
                    </Button>
                  </CardFooter>
                </Card>
              )})}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
