
"use client";

import { useState, useTransition, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, SearchCheck, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface AuditToolDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  campaignId: string;
  contentToAudit: string;
  awardXP: (xp: number, action: string) => Promise<void>;
}

interface AuditResult {
  alignmentScore: number;
  justification: string;
  suggestions: string[];
}

export function AuditToolDialog({ isOpen, onOpenChange, campaignId, contentToAudit, awardXP }: AuditToolDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAuditResult(null);
    }
  }, [isOpen]);

  const handleRunAudit = () => {
    if (!contentToAudit) return;
    startTransition(async () => {
      try {
        const response = await fetch('/api/brand/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentToCheck: contentToAudit, campaignId }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to run brand audit.');
        setAuditResult(result);
        toast({ title: "Audit Complete", description: "Brand alignment results are shown below." });
        await awardXP(10, "auditing content");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        toast({ title: "Audit Failed", description: errorMessage, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Audit Content Against Brand Profile</DialogTitle>
          <DialogDescription>Check how well a piece of content aligns with the campaign's generated Brand Profile.</DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {!auditResult ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Click the button to run the AI brand audit.</p>
              <Button onClick={handleRunAudit} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchCheck className="mr-2 h-4 w-4" />}
                {isPending ? 'Auditing...' : 'Run Brand Audit'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center text-4xl font-bold text-primary flex items-center justify-center gap-1">
                    {auditResult.alignmentScore} <Percent className="h-6 w-6"/>
                  </CardTitle>
                  <CardDescription className="text-center">Brand Alignment Score</CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={auditResult.alignmentScore} />
                </CardContent>
              </Card>
              <div>
                <h4 className="font-semibold">Justification:</h4>
                <p className="text-sm text-muted-foreground">{auditResult.justification}</p>
              </div>
              <div>
                <h4 className="font-semibold">Suggestions:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {auditResult.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
