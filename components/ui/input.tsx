import * as React from 'react';

import { cn } from '../../lib/ui/cn';

export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'rounded-control bg-card text-foreground placeholder:text-muted-foreground h-9 w-full border px-3 text-sm disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
