
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChartBig, Loader2, TrendingUp, AlertTriangle, FileText, Info, Percent, MousePointerClick, Users, Wand2 } from 'lucide-react'; // Updated BarChart to BarChartBig
import { useToast } from '@/hooks/use-toast';
import type { MultiFormatContent } from '@/types/content';
import {ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart as RechartsBarChart } from 'recharts';


// Mock AI call for prediction
async function predictPerformanceAPI(content: MultiFormatContent): Promise<Record<string, { ctr: number; engagement: number; conversion: number; audienceMatch?: number }>> {
  return new Promise(resolve => {
    setTimeout(() => {
      const predictions: Record<string, { ctr: number; engagement: number; conversion: number; audienceMatch?: number }> = {};
      Object.keys(content).forEach(key => {
        const contentKey = key as keyof MultiFormatContent;
        if(content[contentKey] && typeof content[contentKey] === 'string' && content[contentKey]!.length > 0) { 
            predictions[key] = {
            ctr: Math.random() * 5 + 1,       // e.g. 1-6% (Click-Through Rate)
            engagement: Math.random() * 10 + 5, // e.g. 5-15% (Engagement Rate)
            conversion: Math.random() * 2 + 0.5, // e.g. 0.5-2.5% (Conversion Rate for ads/emails)
            audienceMatch: Math.random() * 50 + 50, // e.g. 50-100% (Audience Match Score)
            };
        }
      });
      resolve(predictions);
    }, 1500);
  });
}

interface PerformancePredictorProps {
  campaignId: string | undefined; 
  contentToAnalyze: MultiFormatContent | null;
  onGenerateContentRequest: () => void; // Callback to request content generation
  currentCampaignStatus?: string;
}

type PredictionData = {
  format: string;
  ctr: number;
  engagement: number;
  conversion: number;
  audienceMatch?: number;
};


export function PerformancePredictor({ campaignId, contentToAnalyze, onGenerateContentRequest, currentCampaignStatus }: PerformancePredictorProps) {
  const [predictions, setPredictions] = useState<PredictionData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const hasContentToAnalyze = contentToAnalyze && Object.values(contentToAnalyze).some(val => typeof val === 'string' && val.length > 0);

  const fetchPredictions = async () => {
    if (!hasContentToAnalyze || !contentToAnalyze) { 
      toast({ title: "No Content", description: "Cannot predict performance without content.", variant: "destructive"});
      setPredictions(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setPredictions(null); 
    try {
      const result = await predictPerformanceAPI(contentToAnalyze);
      const formattedData = Object.entries(result).map(([format, metrics]) => ({
        format: format.charAt(0).toUpperCase() + format.slice(1).replace(/([A-Z])/g, ' $1').trim(), 
        ...metrics
      }));
      
      if (formattedData.length === 0) {
        setPredictions([]);
        toast({ title: "No Metrics Available", description: "Could not generate predictions for the provided content." });
      } else {
        setPredictions(formattedData);
        toast({ title: "Prediction Complete", description: "Performance metrics are estimated." });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get predictions.";
      setError(errorMessage);
      toast({ title: "Prediction Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    setPredictions(null);
    setError(null);
  }, [campaignId, contentToAnalyze]);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Performance Predictor
        </CardTitle>
        <CardDescription>
          Estimate potential CTR, engagement, conversion, and audience match for your generated content formats using AI simulation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!campaignId ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-muted-foreground">
                <Info size={48} className="mb-4" />
                <p>Please select a campaign to predict its performance.</p>
            </div>
        ) : !hasContentToAnalyze ? (
           <div className="flex flex-col items-center justify-center min-h-[200px] text-muted-foreground text-center">
            <FileText size={48} className="mb-4" />
            <p className="mb-4">No content available to analyze for the current campaign.</p>
            {currentCampaignStatus === 'draft' || currentCampaignStatus === 'review' && (
                 <Button onClick={onGenerateContentRequest} variant="default">
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Content Now
                </Button>
            )}
             {(currentCampaignStatus === 'generating' || currentCampaignStatus === 'debating') && (
                <p className="text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Content generation in progress...</p>
             )}
          </div>
        ) : (
             <Button onClick={fetchPredictions} disabled={isLoading || !hasContentToAnalyze}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChartBig className="mr-2 h-4 w-4" />}
                Predict Performance
            </Button>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Calculating predictions...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center h-64 text-destructive">
            <AlertTriangle size={48} className="mb-4" />
            <p>Error: {error}</p>
            <p className="text-sm">Please try again.</p>
          </div>
        )}

        {!isLoading && !error && predictions && predictions.length > 0 && hasContentToAnalyze && (
          <div className="space-y-4 pt-4">
            <h3 className="font-semibold text-lg">Predicted Metrics:</h3>
             <ResponsiveContainer width="100%" height={350}>
                <RechartsBarChart data={predictions} margin={{ top: 5, right: 0, left: 0, bottom: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="format" angle={-40} textAnchor="end" height={80} interval={0} />
                    <YAxis unit="%" />
                    <Tooltip 
                        formatter={(value, name) => [`${(value as number).toFixed(2)}%`, name]}
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        cursor={{fill: 'hsl(var(--muted))', fillOpacity: 0.3}}
                    />
                    <Legend 
                        wrapperStyle={{paddingTop: '20px'}} 
                        payload={[
                            { value: 'CTR (Click-Through Rate)', type: 'square', id: 'ctr', color: 'hsl(var(--primary))', iconType: 'square' },
                            { value: 'Engagement %', type: 'square', id: 'engagement', color: 'hsl(var(--accent))', iconType: 'square' },
                            { value: 'Conversion %', type: 'square', id: 'conversion', color: 'hsl(var(--secondary))', iconType: 'square' },
                            { value: 'Audience Match %', type: 'square', id: 'audienceMatch', color: 'hsl(var(--chart-4))', iconType: 'square' }
                        ]}
                    />
                    <Bar dataKey="ctr" fill="hsl(var(--primary))" name="CTR (Click-Through Rate)" radius={[4, 4, 0, 0]} unit="%" />
                    <Bar dataKey="engagement" fill="hsl(var(--accent))" name="Engagement %" radius={[4, 4, 0, 0]} unit="%" />
                    <Bar dataKey="conversion" fill="hsl(var(--secondary))" name="Conversion %" radius={[4, 4, 0, 0]} unit="%" />
                    <Bar dataKey="audienceMatch" fill="hsl(var(--chart-4))" name="Audience Match %" radius={[4, 4, 0, 0]} unit="%" />
                </RechartsBarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground">
                Note: These are AI-driven estimations and actual performance may vary. CTR and Conversion are more relevant for Ads/Email formats. Audience Match is a general score.
            </p>
          </div>
        )}
        
        {!isLoading && !error && predictions && predictions.length === 0 && hasContentToAnalyze && (
             <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText size={48} className="mb-4" />
                <p>No metrics could be generated for the current content.</p>
                <p className="text-sm">This might happen if the content is too short or lacks enough substance for prediction.</p>
            </div>
        )}

         {!isLoading && !error && predictions === null && hasContentToAnalyze && campaignId && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText size={48} className="mb-4" />
                <p>Click "Predict Performance" to see estimated metrics for the current content.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

