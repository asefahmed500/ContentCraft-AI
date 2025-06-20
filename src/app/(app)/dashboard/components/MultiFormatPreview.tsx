"use client";

import type { MultiFormatContent } from '@/types/content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileText, Tv2, Copy, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const availableFormats = content ? Object.keys(content).filter(key => content[key as keyof MultiFormatContent] && formatLabels[key as keyof MultiFormatContent]) as (keyof MultiFormatContent)[] : [];
  
  const handleCopy = (textToCopy: string | undefined) => {
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => toast({ title: "Copied to clipboard!" }))
        .catch(err => toast({ title: "Failed to copy", description: err.message, variant: "destructive" }));
    }
  };

  // Placeholder for download functionality
  const handleDownload = (textToDownload: string | undefined, formatName: string) => {
     if (textToDownload) {
      const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${formatName.toLowerCase().replace(/\s+/g, '-')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: `${formatName} download started.` });
    }
  };
  
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
            <p className="text-sm">Start a new campaign to see results.</p>
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
        <CardDescription>Preview the generated content across different platforms. Copy or download individual pieces.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab} className="w-full">
          <ScrollArea orientation="horizontal" className="pb-2">
            <TabsList className="grid w-full grid-cols-min sm:grid-cols-min lg:grid-cols-min xl:grid-cols-min gap-1 h-auto flex-wrap sm:flex-nowrap">
              {availableFormats.map((formatKey) => (
                <TabsTrigger key={formatKey} value={formatKey} className="text-xs sm:text-sm break-all px-2 py-1.5 whitespace-nowrap">
                  {formatLabels[formatKey] || formatKey}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
          {availableFormats.map((formatKey) => (
            <TabsContent key={formatKey} value={formatKey}>
              <Card className="mt-2">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="font-headline text-lg">{formatLabels[formatKey] || formatKey}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopy(content?.[formatKey])}>
                      <Copy className="mr-1 h-3 w-3" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(content?.[formatKey], formatLabels[formatKey] || formatKey)}>
                      <Download className="mr-1 h-3 w-3" /> Download
                    </Button>
                  </div>
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
