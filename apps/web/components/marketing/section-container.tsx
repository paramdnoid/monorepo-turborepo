import { type ReactNode } from "react";

import { cn } from "@repo/ui/utils";

const widthClasses = {
  narrow: "max-w-3xl",
  default: "max-w-7xl",
  wide: "max-w-[90rem]",
  full: "",
} as const;

export function SectionContainer({
  children,
  className,
  width = "default",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  width?: keyof typeof widthClasses;
  as?: "div" | "main" | "section" | "nav" | "footer" | "header";
}) {
  return (
    <Tag className={cn("mx-auto px-4 sm:px-6 md:px-8", widthClasses[width], className)}>
      {children}
    </Tag>
  );
}
