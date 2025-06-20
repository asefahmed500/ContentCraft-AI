
"use client";

import type { MultiFormatContent } from '@/types/content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileText, Tv2, Copy, Download, Loader2, FileType, Share2, CalendarClock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


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
  
  const availableFormats = content 
    ? Object.keys(content).filter(key => {
        const contentKey = key as keyof MultiFormatContent;
        return content[contentKey] && typeof content[contentKey] === 'string' && (formatLabels[contentKey] !== undefined);
      }) as (keyof MultiFormatContent)[]
    : [];
  
  const handleCopy = (textToCopy: string | undefined) => {
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => toast({ title: "Copied to clipboard!" }))
        .catch(err => toast({ title: "Failed to copy", description: err.message, variant: "destructive" }));
    } else {
        toast({ title: "Nothing to copy", description: "Content is empty.", variant: "destructive" });
    }
  };

  const handleDownload = (textToDownload: string | undefined, formatName: string) => {
     if (textToDownload) {
      const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-h' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${formatName.toLowerCase().replace(/\s+/g, '-')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: `${formatName} TXT download started.` });
    } else {
        toast({ title: "Nothing to download", description: "Content is empty.", variant: "destructive" });
    }
  };

  const handleComingSoon = (featureName: string) => {
    toast({ title: `${featureName} is Coming Soon!`, description: "This feature is under development."});
  };
  
  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2"><Tv2 className="h-6 w-6 text-primary" />Multi-Format Content Preview</CardTitle>
          <CardDescription>Generating content in various formats... Please wait.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p>Agents are crafting your content...</p>
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
            <p>No content generated or selected for preview.</p>
            <p className="text-sm">Start or select a campaign and generate content to see results.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const defaultTab = availableFormats.find(key => content[key]) || availableFormats[0] || "blogPost";

  return (
    <TooltipProvider>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2"><Tv2 className="h-6 w-6 text-primary" />Multi-Format Content Preview</CardTitle>
          <CardDescription>Preview the generated content across different platforms. Copy, download, or export individual pieces.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="w-full">
            <ScrollArea orientation="horizontal" className="pb-2 border-b">
              <TabsList className="grid w-full grid-cols-min sm:grid-cols-min lg:grid-cols-min xl:grid-cols-min gap-1 h-auto flex-wrap sm:flex-nowrap bg-transparent p-0">
                {availableFormats.map((formatKey) => (
                  <TabsTrigger 
                      key={formatKey} 
                      value={formatKey} 
                      className="text-xs sm:text-sm break-all px-3 py-2 whitespace-nowrap data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:text-primary rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                  >
                    {formatLabels[formatKey] || formatKey}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
            {availableFormats.map((formatKey) => (
              <TabsContent key={formatKey} value={formatKey} className="mt-4">
                <Card className="border shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/30 rounded-t-lg">
                    <CardTitle className="font-headline text-lg">{formatLabels[formatKey] || formatKey}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleCopy(content?.[formatKey])}>
                        <Copy className="mr-1 h-3 w-3" /> Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownload(content?.[formatKey], formatLabels[formatKey] || formatKey)}>
                        <Download className="mr-1 h-3 w-3" /> TXT
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" disabled onClick={() => handleComingSoon('PDF Export')}>
                            <FileType className="mr-1 h-3 w-3" /> PDF
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Export as PDF (Coming Soon)</p>
                        </TooltipContent>
                      </Tooltip>
                       <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="outline" size="sm" disabled onClick={() => handleComingSoon('Share/Schedule')}>
                            <Share2 className="mr-1 h-3 w-3" /> Share
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Share or Schedule (Coming Soon)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ScrollArea className="h-[250px] w-full rounded-md border p-4 bg-background">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {content[formatKey] || "No content for this format."}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
