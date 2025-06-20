import { BrainCircuit } from 'lucide-react';
import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center gap-2" aria-label="ContentCraft AI Logo">
       <BrainCircuit className="h-8 w-8 text-primary" {...props} />
      <span className="text-2xl font-headline font-semibold text-primary">ContentCraft AI</span>
    </div>
  );
}
