import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";

export function GradientCta({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      size="lg"
      className={cn(
        "group h-13 w-full gap-2 bg-primary px-8 text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 sm:w-auto",
        className,
      )}
      asChild
    >
      <Link href={href}>
        {children}
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      </Link>
    </Button>
  );
}
