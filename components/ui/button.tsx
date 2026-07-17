import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../lib/ui/cn';

const buttonVariants = cva(
  'inline-flex h-9 items-center justify-center gap-2 rounded-control px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:brightness-110',
        secondary:
          'bg-muted text-foreground hover:brightness-95 dark:hover:brightness-125',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        destructive: 'text-destructive hover:bg-destructive/10',
        outline: 'border bg-card hover:bg-muted',
      },
      size: {
        default: 'h-9 px-3',
        sm: 'h-8 rounded-lg px-2.5 text-xs',
        icon: 'size-9 px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
