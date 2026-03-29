import * as React from 'react';
import { Pressable, Text } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'flex flex-row items-center justify-center gap-2 rounded-full border border-transparent active:opacity-90 disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        outline: 'border-border bg-background dark:border-input',
        secondary: 'bg-secondary',
      },
      size: {
        default: 'min-h-8 px-3 py-1.5',
        lg: 'min-h-9 px-4 py-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const labelVariants = cva('text-center text-sm font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      outline: 'text-foreground',
      secondary: 'text-secondary-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type ButtonProps = React.ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    /** String label or composite content (e.g. icon + text like web `Button` + `Image`). */
    children: React.ReactNode;
  };

function Button({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}: ButtonProps) {
  const isPlainText =
    typeof children === 'string' || typeof children === 'number';

  return (
    <Pressable
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {isPlainText ? (
        <Text className={cn(labelVariants({ variant }))}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export { Button };
