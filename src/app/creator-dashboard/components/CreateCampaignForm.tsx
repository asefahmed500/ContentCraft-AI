
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import type { Campaign } from '@/types/content';
import { Switch } from '@/components/ui/switch';


const campaignFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.').max(100, 'Title is too long.'),
  brief: z.string().min(10, 'Brief must be at least 10 characters long.').max(1000, 'Brief is too long.'),
  targetAudience: z.string().max(200, 'Target audience description is too long.').optional(),
  tone: z.string().max(100, 'Tone description is too long.').optional(),
  isPrivate: z.boolean().default(false),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface CreateCampaignFormProps {
  onSuccess: (campaign: Campaign) => void;
}

export function CreateCampaignForm({ onSuccess }: CreateCampaignFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      title: '',
      brief: '',
      targetAudience: '',
      tone: '',
      isPrivate: false,
    },
  });

  async function onSubmit(data: CampaignFormValues) {
    setIsLoading(true);
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create campaign.');
      }
      
      toast({ title: "Campaign Created!", description: `Your campaign "${result.title}" is ready.` });
      onSuccess(result as Campaign);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Campaign Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Eco-Friendly Coffee Subscription Launch" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="brief"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Creative Brief</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe your product, service, or main topic. What are you trying to promote?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="targetAudience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Audience (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Urban professionals, age 25-40, who value sustainability." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="tone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Desired Tone (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Playful and witty, professional and authoritative." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="isPrivate"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Private Campaign</FormLabel>
                <FormDescription>
                  If enabled, this campaign will not be visible to others.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
          Create Campaign
        </Button>
      </form>
    </Form>
  );
}
