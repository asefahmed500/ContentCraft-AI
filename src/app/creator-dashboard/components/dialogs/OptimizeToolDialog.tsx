
"use client";

import { useState, useTransition } from 'react';
import type { ContentVersion } from '@/types/content';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Save, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface OptimizeToolDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  campaignId: string;
  contentToOptimize: { version: ContentVersion; originalContent: string; contentType: string };
  onSave: (newContent: string, format: string, sourceVersion: ContentVersion, changeSummary: string, actorName: string) => Promise<void>;
  awardXP: (xp: number, action: string) => Promise<void>;
}

interface OptimizationResult {
  predictedPerformance: { score: number; justification: string };
  optimizedContent: string;
  explanation: string;
}

export function OptimizeToolDialog({ isOpen, onOpenChange, campaignId, contentToOptimize, onSave, awardXP }: OptimizeToolDialogProps) {
  const { toast } = useToast();
  const [isProcessing, startTransition] = useTransition();
  const [optimizationGoal, setOptimizationGoal] = useState('Improve user engagement');
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);

  const handleOptimizeContent = () => {
    if (!contentToOptimize || !optimizationGoal.trim()) {
        toast({ title: "Input Required", description: "Please select an optimization goal.", variant: "destructive" });
        return;
    }
    startTransition(async () => {
        try {
            const response = await fetch('/api/content/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalContent: contentToOptimize.originalContent,
                    contentType: contentToOptimize.contentType,
                    optimizationGoal,
                    campaignId: campaignId,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to optimize content.');
            setOptimizationResult(result);
            toast({ title: "Optimization Complete", description: "The AI has provided an optimized version below." });
            await awardXP(10, "optimizing content");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            toast({ title: "Optimization Failed", description: errorMessage, variant: "destructive" });
        }
    });
  };

  const handleSave = () => {
    if (optimizationResult) {
      onSave(
        optimizationResult.optimizedContent,
        contentToOptimize.contentType,
        contentToOptimize.version,
        `Optimized for "${optimizationGoal}"`,
        'Optimizer Agent'
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Optimize Content</DialogTitle>
          <DialogDescription>Rewrite content to achieve a specific performance goal like increased engagement or click-through rate.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-2">
            <Label>Original Content ({contentToOptimize.contentType})</Label>
            <Textarea readOnly value={contentToOptimize.originalContent} rows={12} className="text-xs" />
          </div>
          <div className="space-y-2">
            <Label>Optimized Content</Label>
            <Textarea readOnly value={optimizationResult?.optimizedContent ?? "AI optimization will appear here..."} rows={12} className="text-xs" />
          </div>
        </div>
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Label htmlFor="optimization-goal" className="flex-shrink-0">Optimization Goal</Label>
                <Select value={optimizationGoal} onValueChange={setOptimizationGoal}>
                    <SelectTrigger id="optimization-goal" className="w-full sm:w-[300px]">
                        <SelectValue placeholder="Select a goal" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Improve user engagement">Improve User Engagement</SelectItem>
                        <SelectItem value="Increase click-through rate">Increase Click-Through Rate</SelectItem>
                        <SelectItem value="Boost conversion rate">Boost Conversion Rate</SelectItem>
                        <SelectItem value="Enhance SEO with keywords">Enhance SEO</SelectItem>
                    </SelectContent>
                </Select>
                 <Button onClick={handleOptimizeContent} disabled={isProcessing} className="w-full sm:w-auto">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                    {isProcessing ? 'Optimizing...' : 'Run Optimization'}
                </Button>
            </div>

            {optimizationResult && (
                <div className="space-y-4 pt-4 border-t">
                    <Card>
                        <CardHeader>
                            <CardDescription>Original Content Performance Score</CardDescription>
                             <CardTitle className="text-2xl text-primary">{optimizationResult.predictedPerformance.score}/100</CardTitle>
                        </CardHeader>
                         <CardContent>
                             <Progress value={optimizationResult.predictedPerformance.score} className="h-2" />
                             <p className="text-xs text-muted-foreground mt-2">{optimizationResult.predictedPerformance.justification}</p>
                         </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Explanation of Changes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{optimizationResult.explanation}</p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
        <DialogFooter>
          {optimizationResult && (
            <Button onClick={handleSave} disabled={isProcessing} variant="secondary">
              <Save className="mr-2 h-4 w-4" /> Save as New Version
            </Button>
          )}
          <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
