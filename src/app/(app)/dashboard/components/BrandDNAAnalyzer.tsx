
"use client";

import type { ChangeEvent} from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { AnalyzeBrandDNAOutput } from '@/ai/flows/brand-learning';
import { Loader2, UploadCloud, FileText, Palette, Sparkles, AlertTriangle, MessageSquareQuote, Paintbrush, Gem } from 'lucide-react';

export function BrandDNAAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeBrandDNAOutput | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setAnalysisResult(null); // Reset previous results
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please select a file to analyze.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64File = reader.result as string;
        if (!base64File) {
          throw new Error("Failed to read file.");
        }
        
        const response = await fetch('/api/brand/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contentDataUri: base64File }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.details || "Analysis request failed.");
        }
        
        const result: AnalyzeBrandDNAOutput = await response.json();
        
        setAnalysisResult(result);
        toast({ title: "Analysis Complete", description: "Brand DNA has been extracted." });
      };
      reader.onerror = (error) => {
        console.error("File reading error:", error);
        throw new Error("Error reading file.");
      };
    } catch (error) {
      console.error("Brand DNA Analysis Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during analysis.";
      toast({ title: "Analysis Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Brand DNA Analyzer
        </CardTitle>
        <CardDescription>Upload existing brand content (e.g., .txt, .md, .pdf, .doc, .docx) to extract its unique voice, style, and values. Gemini AI will analyze the content.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="brand-file" className="text-base">Upload Content File</Label>
          <div className="flex items-center space-x-2">
            <Input id="brand-file" type="file" onChange={handleFileChange} accept=".txt,.md,.pdf,.doc,.docx" className="flex-grow" />
            <Button onClick={handleSubmit} disabled={isLoading || !file} className="min-w-[120px]">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><UploadCloud className="mr-2 h-5 w-5" /> Analyze</>}
            </Button>
          </div>
          {file && <p className="text-sm text-muted-foreground">Selected file: {file.name}</p>}
        </div>

        {analysisResult && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-headline text-xl">Analysis Results:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2"><MessageSquareQuote className="h-5 w-5 text-primary" />Voice Profile & Tone</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{analysisResult.brandProfile.voiceProfile}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2"><Paintbrush className="h-5 w-5 text-primary" />Visual Language & Identity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{analysisResult.brandProfile.visualIdentity}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2"><Gem className="h-5 w-5 text-primary" />Core Values</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{analysisResult.brandProfile.values}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Consistency Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{analysisResult.consistencyScore}%</p>
                </CardContent>
              </Card>
            </div>
            {analysisResult.warnings && analysisResult.warnings.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Warnings:</h4>
                <ul className="list-disc list-inside text-sm text-destructive space-y-1 mt-1">
                  {analysisResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
