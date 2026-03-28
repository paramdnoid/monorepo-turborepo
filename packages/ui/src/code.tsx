import type * as React from "react";
import { cn } from "./utils";

export type CodeProps = React.HTMLAttributes<HTMLElement>;
export function Code({ className, ...props }: CodeProps) {
  return (
    <code
      className={cn(
        "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm",
        className,
      )}
      {...props}
    />
  );
}
