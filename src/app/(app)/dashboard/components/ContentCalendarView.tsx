
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Construction } from 'lucide-react';

export function ContentCalendarView() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          Content Calendar & Scheduler
        </CardTitle>
        <CardDescription>
          Plan, schedule, and visualize your content output. Drag-and-drop posts onto the calendar, manage publication times, and integrate with your favorite social media platforms.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground space-y-4 py-10">
        <Construction size={64} className="text-primary/70" />
        <h3 className="text-xl font-semibold">Coming Soon!</h3>
        <p className="text-center max-w-md">
          Our interactive content calendar with drag-and-drop scheduling and platform integrations is currently under development. Stay tuned for updates!
        </p>
      </CardContent>
    </Card>
  );
}
