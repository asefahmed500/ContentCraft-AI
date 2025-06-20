"use client";

import type { MultiFormatContent } from '@/types/content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Tv2 } from 'lucide-react';

interface MultiFormatPreviewProps {
  content: MultiFormatContent | null;
  isLoading: boolean;
}

const formatLabels: Record<keyof MultiFormatContent, string> = {
  blogPost: "Blog Post",
  tweet: "Tweet",
  linkedInArticle: "LinkedIn Article",
  instagramPost: "Instagram Post",
  tiktokScript: "TikTok Script",
  emailCampaign: "Email Campaign",
  adsCopy: "Ads Copy",
};

export function MultiFormatPreview({ content, isLoading }: MultiFormatPreviewProps) {
  const availableFormats = content ? Object.keys(content).filter(key => content[key as keyof MultiFormatContent] && formatLabels[key as keyof MultiFormatContent]) as (keyof MultiFormatContent)[] : [];
  
  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2"><Tv2 className="h-6 w-6 text-primary" />Multi-Format Content Preview</CardTitle>
          <CardDescription>Generating content in various formats...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <FileText className="h-12 w-12 text-muted-foreground animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!content || availableFormats.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2"><Tv2 className="h-6 w-6 text-primary" />Multi-Format Content Preview</CardTitle>
          <CardDescription>Generated content will appear here in various formats.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileText size={48} className="mb-4" />
            <p>No content generated yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const defaultTab = availableFormats[0] || "blogPost";

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2"><Tv2 className="h-6 w-6 text-primary" />Multi-Format Content Preview</CardTitle>
        <CardDescription>Preview the generated content across different platforms.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-1 h-auto flex-wrap">
            {availableFormats.map((formatKey) => (
              <TabsTrigger key={formatKey} value={formatKey} className="text-xs sm:text-sm break-all">
                {formatLabels[formatKey] || formatKey}
              </TabsTrigger>
            ))}
          </TabsList>
          {availableFormats.map((formatKey) => (
            <TabsContent key={formatKey} value={formatKey}>
              <Card className="mt-2">
                <CardHeader>
                  <CardTitle className="font-headline">{formatLabels[formatKey] || formatKey}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-muted/30">
                    <pre className="whitespace-pre-wrap text-sm">
                      {content[formatKey]}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
