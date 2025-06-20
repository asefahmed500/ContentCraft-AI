import type { ContentPiece } from '@/types/content';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ContentCardProps {
  content: Partial<ContentPiece>;
  className?: string;
}

export function ContentCard({ content, className }: ContentCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        {content.title && <CardTitle className="font-headline text-lg">{content.title}</CardTitle>}
        <CardDescription className="flex flex-wrap gap-2 items-center">
          {content.format && <Badge variant="outline">{content.format}</Badge>}
          {content.version && <Badge variant="secondary">v{content.version}</Badge>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm line-clamp-4">
          {content.text || "No content available."}
        </p>
      </CardContent>
      {content.updatedAt && (
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Last updated: {format(new Date(content.updatedAt), "PPp")}
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
