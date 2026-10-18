import React from 'react';
import { cn } from '@/lib/cn';

// ATOM: a white rounded box.   <Card className="p-4">...</Card>
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-2xl border border-slate-100 bg-white text-slate-950 shadow-sm',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';
