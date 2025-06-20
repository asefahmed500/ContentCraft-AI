"use client";

import type { ChangeEvent} from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { AnalyzeBrandDNAInput, AnalyzeBrandDNAOutput } from '@/ai/flows/brand-learning';
import { analyzeBrandDNA } from '@/ai/flows/brand-learning'; // Assuming path is correct
import { Loader2, UploadCloud, FileText, Palette, Sparkles, AlertTriangle } from 'lucide-react';

async function analyzeBrandDNAAction(input: AnalyzeBrandDNAInput): Promise<AnalyzeBrandDNAOutput | { error: string }> {
  try {
    const result = await analyzeBrandDNA(input);
    return result;
  } catch (error) {
    console.error("Error in analyzeBrandDNAAction:", error);
    return { error: error instanceof Error ? error.message : "An unknown error occurred." };
  }
}


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
        
        const result = await analyzeBrandDNAAction({ contentDataUri: base64File });

        if ('error' in result) {
          throw new Error(result.error);
        }
        
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
        <CardDescription>Upload existing brand content (e.g., .txt, .md, .pdf) to extract its unique voice, style, and values.</CardDescription>
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
                  <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Voice Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{analysisResult.brandProfile.voiceProfile}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2"><Palette className="h-5 w-5 text-primary" />Visual Identity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{analysisResult.brandProfile.visualIdentity}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Core Values</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{analysisResult.brandProfile.values}</p>
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
              <div>
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
