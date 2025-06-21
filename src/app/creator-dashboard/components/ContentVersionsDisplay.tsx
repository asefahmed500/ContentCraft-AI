
"use client";

import type { Campaign, ContentVersion } from '@/types/content';
import type { SubmittedFeedback } from './CampaignDetailClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';
import { Loader2, Sparkles, PencilRuler, ThumbsUp, ThumbsDown, SearchCheck, Languages, Zap } from 'lucide-react';
import { useState } from 'react';

interface ContentVersionsDisplayProps {
    campaign: Campaign;
    isGeneratingContent: boolean;
    submittedFeedback: SubmittedFeedback;
    onGenerateInitialContent: () => void;
    onOpenToolDialog: (tool: 'revise' | 'audit' | 'translate' | 'optimize', version: ContentVersion, originalContent: string, contentType: string) => void;
    onFeedbackSubmit: (version: ContentVersion, format: string, rating: 1 | -1) => Promise<void>;
}

export function ContentVersionsDisplay({
    campaign,
    isGeneratingContent,
    submittedFeedback,
    onGenerateInitialContent,
    onOpenToolDialog,
    onFeedbackSubmit,
}: ContentVersionsDisplayProps) {
    const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);

    const handleFeedback = async (version: ContentVersion, format: string, rating: 1 | -1) => {
        const key = `${version.id}-${format}`;
        setFeedbackLoading(key);
        await onFeedbackSubmit(version, format, rating);
        setFeedbackLoading(null);
    };

    const formatTitle = (key: string) => {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><PencilRuler className="h-5 w-5 text-primary"/> Content Versions</CardTitle>
                <CardDescription>Generated content based on the campaign brief and strategy debate. Use the tools to refine it.</CardDescription>
            </CardHeader>
            <CardContent>
                {campaign.contentVersions.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">No content has been generated yet.</p>
                        <Button onClick={onGenerateInitialContent} disabled={isGeneratingContent}>
                            {isGeneratingContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                            {isGeneratingContent ? "Generating..." : "Generate Initial Content"}
                        </Button>
                    </div>
                ) : (
                    <Accordion type="single" collapsible className="w-full" defaultValue={`v-${campaign.contentVersions[campaign.contentVersions.length - 1].versionNumber}`}>
                        {campaign.contentVersions.map((version) => (
                            <AccordionItem value={`v-${version.versionNumber}`} key={version.id}>
                                <AccordionTrigger>Version {version.versionNumber} by {version.actorName}</AccordionTrigger>
                                <AccordionContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground">{version.changeSummary}</p>
                                    <Separator/>
                                    <div className="space-y-3">
                                        {Object.entries(version.multiFormatContentSnapshot).map(([format, text]) => 
                                            text ? (
                                                <div key={format} className="p-3 border rounded-md bg-muted/50">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="font-semibold text-sm capitalize">{formatTitle(format)}</h4>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7"
                                                                onClick={() => handleFeedback(version, format, 1)}
                                                                disabled={feedbackLoading === `${version.id}-${format}` || !!submittedFeedback[`${version.id}-${format}`]}
                                                                title="Good content"
                                                            >
                                                                <ThumbsUp className={`h-4 w-4 ${submittedFeedback[`${version.id}-${format}`] === 'up' ? 'text-primary fill-primary' : ''}`} />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7"
                                                                onClick={() => handleFeedback(version, format, -1)}
                                                                disabled={feedbackLoading === `${version.id}-${format}` || !!submittedFeedback[`${version.id}-${format}`]}
                                                                title="Needs improvement"
                                                            >
                                                                <ThumbsDown className={`h-4 w-4 ${submittedFeedback[`${version.id}-${format}`] === 'down' ? 'text-destructive fill-destructive' : ''}`} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <pre className="whitespace-pre-wrap text-xs p-2 border rounded bg-background max-h-40 overflow-y-auto">{text}</pre>
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        <Button size="sm" variant="outline" onClick={() => onOpenToolDialog('revise', version, text, format)}>
                                                            <Sparkles className="mr-1 h-3 w-3"/> Revise
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => onOpenToolDialog('audit', version, text, format)} disabled={!campaign.brandProfile}>
                                                            <SearchCheck className="mr-1 h-3 w-3"/> Audit
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => onOpenToolDialog('translate', version, text, format)}>
                                                            <Languages className="mr-1 h-3 w-3"/> Translate
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => onOpenToolDialog('optimize', version, text, format)}>
                                                            <Zap className="mr-1 h-3 w-3"/> Optimize
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : null
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}
