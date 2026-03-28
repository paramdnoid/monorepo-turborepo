import * as React from 'react';
import { Text } from 'react-native';

import { cn } from '../../lib/utils';

function Code({ className, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn(
        'rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Code };
