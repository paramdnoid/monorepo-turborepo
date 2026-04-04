"use client";

import {
  Banknote,
  BarChart3,
  BrainCircuit,
  BrickWall,
  Building2,
  Calculator,
  CalendarDays,
  CalendarRange,
  Camera,
  ClipboardCheck,
  Clock,
  FileCheck,
  FileDigit,
  FileOutput,
  FilePenLine,
  FileSpreadsheet,
  FileText,
  Files,
  FolderKanban,
  FolderOpen,
  Gauge,
  LandPlot,
  Layers,
  type LucideIcon,
  MapPin,
  PackageSearch,
  Palette,
  PenLine,
  Pipette,
  Receipt,
  Route,
  Ruler,
  RulerDimensionLine,
  Scan,
  Shield,
  ShoppingCart,
  Smartphone,
  SwatchBook,
  Table2,
  Thermometer,
  Users,
  UsersRound,
  Warehouse,
  Wrench,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Banknote,
  BarChart3,
  BrainCircuit,
  BrickWall,
  Building2,
  Calculator,
  CalendarDays,
  CalendarRange,
  Camera,
  ClipboardCheck,
  Clock,
  FileCheck,
  FileDigit,
  FileOutput,
  FilePenLine,
  FileSpreadsheet,
  FileText,
  Files,
  FolderKanban,
  FolderOpen,
  Gauge,
  LandPlot,
  Layers,
  MapPin,
  PackageSearch,
  Palette,
  PenLine,
  Pipette,
  Receipt,
  Route,
  Ruler,
  RulerDimensionLine,
  Scan,
  Shield,
  ShoppingCart,
  Smartphone,
  SwatchBook,
  Table2,
  Thermometer,
  Users,
  UsersRound,
  Warehouse,
  Wrench,
};

export type TradeFeatureIconVariant = "marketing" | "nav";

export function TradeFeatureIcon({
  name,
  variant = "marketing",
}: {
  name: string;
  variant?: TradeFeatureIconVariant;
}) {
  const Icon = iconMap[name];
  if (!Icon) return null;
  const nav = variant === "nav";
  return (
    <Icon
      className={nav ? "size-4 shrink-0" : "h-4 w-4 shrink-0 text-primary"}
      strokeWidth={nav ? 2 : 1.8}
      aria-hidden="true"
    />
  );
}
