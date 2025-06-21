
"use client";

import type { ScheduledPost } from "@/types/content";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Rss, Twitter, Linkedin, Mail, Megaphone } from "lucide-react";

interface ContentCalendarDisplayProps {
  schedule: ScheduledPost[];
}

const platformIcons: Record<string, React.ElementType> = {
  "Blog": Rss,
  "Twitter": Twitter,
  "LinkedIn": Linkedin,
  "Email Newsletter": Mail,
  "Instagram": Megaphone,
  "Social Media": Megaphone,
};

export function ContentCalendarDisplay({ schedule }: ContentCalendarDisplayProps) {
  if (!schedule || schedule.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4 text-sm">
        No schedule available.
      </p>
    );
  }

  // Ensure schedule is sorted by date
  const sortedSchedule = [...schedule].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return (
    <div className="space-y-4">
      {sortedSchedule.map((item, index) => {
        const Icon = platformIcons[item.platform] || Megaphone;
        return (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-4 bg-muted/50 border-b">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base line-clamp-1">{item.contentFormat}</CardTitle>
                <CardDescription>
                  {format(new Date(item.scheduledAt), "EEEE, MMM d")} on <span className="font-semibold">{item.platform}</span>
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
