"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Loader2, TrendingUp, AlertTriangle, FileText, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MultiFormatContent } from '@/types/content';
import {ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart as RechartsBarChart } from 'recharts';


// Mock AI call for prediction
async function predictPerformanceAPI(content: MultiFormatContent): Promise<Record<string, { engagement: number; ctr: number; conversion: number }>> {
  return new Promise(resolve => {
    setTimeout(() => {
      const predictions: Record<string, { engagement: number; ctr: number; conversion: number }> = {};
      Object.keys(content).forEach(key => {
        if(content[key as keyof MultiFormatContent]) {
            predictions[key] = {
            engagement: Math.random() * 10 + 5, // e.g. 5-15%
            ctr: Math.random() * 5 + 1,       // e.g. 1-6%
            conversion: Math.random() * 2 + 0.5 // e.g. 0.5-2.5%
            };
        }
      });
      resolve(predictions);
    }, 1500);
  });
}

interface PerformancePredictorProps {
  campaignId: string;
  contentToAnalyze: MultiFormatContent | null;
}

type PredictionData = {
  format: string;
  engagement: number;
  ctr: number;
  conversion: number;
};


export function PerformancePredictor({ campaignId, contentToAnalyze }: PerformancePredictorProps) {
  const [predictions, setPredictions] = useState<PredictionData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPredictions = async () => {
    if (!contentToAnalyze) {
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
        format: format.charAt(0).toUpperCase() + format.slice(1).replace(/([A-Z])/g, ' $1').trim(), // Format name nicely
        ...metrics
      }));
      setPredictions(formattedData);
      toast({ title: "Prediction Complete", description: "Performance metrics are estimated." });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get predictions.";
      setError(errorMessage);
      toast({ title: "Prediction Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Automatically fetch if content is available on mount or content change
  // useEffect(() => {
  //   if (contentToAnalyze && Object.keys(contentToAnalyze).length > 0) {
  //     fetchPredictions();
  //   } else {
  //     setPredictions(null); // Clear predictions if no content
  //   }
  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [contentToAnalyze]);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Performance Predictor
        </CardTitle>
        <CardDescription>
          Estimate potential engagement, CTR, and conversion rates for your generated content formats.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!contentToAnalyze || Object.keys(contentToAnalyze).length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Info size={48} className="mb-4" />
            <p>No content available to analyze.</p>
            <p className="text-sm">Generate a campaign first, then click "Predict Performance".</p>
          </div>
        ) : (
             <Button onClick={fetchPredictions} disabled={isLoading || !contentToAnalyze}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart className="mr-2 h-4 w-4" />}
                Predict Performance
            </Button>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Calculating predictions...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-64 text-destructive">
            <AlertTriangle size={48} className="mb-4" />
            <p>Error: {error}</p>
            <p className="text-sm">Please try again.</p>
          </div>
        )}

        {!isLoading && !error && predictions && predictions.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Predicted Metrics (%):</h3>
             <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={predictions} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="format" angle={-20} textAnchor="end" height={60} interval={0} />
                    <YAxis />
                    <Tooltip formatter={(value) => `${(value as number).toFixed(2)}%`} />
                    <Legend />
                    <Bar dataKey="engagement" fill="hsl(var(--primary))" name="Engagement" />
                    <Bar dataKey="ctr" fill="hsl(var(--accent))" name="CTR" />
                    <Bar dataKey="conversion" fill="hsl(var(--secondary))" name="Conversion" />
                </RechartsBarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground">
                Note: These are AI-driven estimations and actual performance may vary.
            </p>
          </div>
        )}
         {!isLoading && !error && predictions === null && contentToAnalyze && Object.keys(contentToAnalyze).length > 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText size={48} className="mb-4" />
                <p>Click "Predict Performance" to see estimated metrics.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
