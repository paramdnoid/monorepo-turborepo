"use client";

import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";

import { cn } from "@repo/ui/utils";
import { toggleVariants } from "@repo/ui/toggle";

type ToggleGroupVariant = "default" | "outline" | "premium";
type ToggleItemSize = NonNullable<VariantProps<typeof toggleVariants>["size"]> | "md";

const ToggleGroupContext = React.createContext<{
  variant: ToggleGroupVariant;
  size: ToggleItemSize;
  spacing: number;
  orientation: "horizontal" | "vertical";
}>({
  variant: "default",
  size: "default",
  spacing: 0,
  orientation: "horizontal",
});

function mapVariantForCva(v: ToggleGroupVariant): "default" | "outline" {
  return v === "premium" ? "default" : v;
}

function mapSizeForCva(s: ToggleItemSize): NonNullable<VariantProps<typeof toggleVariants>["size"]> {
  return s === "md" ? "default" : s;
}

function ToggleGroup({
  className,
  variant = "default",
  size = "default",
  spacing = 0,
  orientation = "horizontal",
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  variant?: ToggleGroupVariant;
  size?: ToggleItemSize;
  spacing?: number;
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      style={{ "--gap": spacing } as React.CSSProperties}
      className={cn(
        "group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-lg data-[size=sm]:rounded-[min(var(--radius-md),10px)] data-vertical:flex-col data-vertical:items-stretch",
        "data-[variant=premium]:rounded-[min(var(--radius-lg),14px)] data-[variant=premium]:bg-muted/40 data-[variant=premium]:p-1",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing, orientation }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  activeStyle = "neutral",
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & {
  variant?: ToggleGroupVariant;
  size?: ToggleItemSize;
  activeStyle?: "neutral" | "primary";
}) {
  const context = React.useContext(ToggleGroupContext);
  const resolvedVariant = mapVariantForCva(context.variant || variant);
  const resolvedSize = mapSizeForCva(context.size || size);

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        "shrink-0 group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2 focus:z-10 focus-visible:z-10 group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-l-lg group-data-vertical/toggle-group:data-[spacing=0]:first:rounded-t-lg group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-r-lg group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-b-lg group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
        activeStyle === "primary" &&
          "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm",
        toggleVariants({
          variant: resolvedVariant,
          size: resolvedSize,
        }),
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
