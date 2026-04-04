import {
  Droplet,
  Flame,
  HardHat,
  type LucideIcon,
  Paintbrush,
  Plug,
  TreePine,
  Wrench,
} from "lucide-react";
import { type Locale, normalizeLocale } from "@/lib/i18n/locale";

// Additional icon names used in tradeFeatures:
// Shield, BarChart3, Route, Layers, Scan, Building2, Pipette, FileText

export interface TradeFeatureItem {
  label: string;
  description: string;
  icon: string;
}

export interface TradeStat {
  value: string;
  label: string;
}

export interface Trade {
  icon: LucideIcon;
  slug: string;
  name: string;
  tabLabel: string;
  description: string;
  highlight?: string;
  stats: TradeStat[];
  tradeFeatures: TradeFeatureItem[];
  coreFeatures: TradeFeatureItem[];
}

export interface SecondaryTrade {
  icon: LucideIcon;
  name: string;
  comingSoon: boolean;
}

const coreBase: TradeFeatureItem[] = [
  {
    label: "Mobile App",
    description: "Alle Funktionen auch unterwegs auf dem Smartphone.",
    icon: "Smartphone",
  },
  {
    label: "Digitale Dokumentation & Foto-Upload",
    description: "Fotos, Notizen und Dokumente direkt vor Ort erfassen.",
    icon: "Camera",
  },
  {
    label: "Terminplanung / Digitale Plantafel",
    description: "Termine und Einsaetze uebersichtlich planen und verteilen.",
    icon: "CalendarDays",
  },
  {
    label: "Angebots- & Rechnungswesen",
    description: "Dokumente erstellen und direkt digital versenden.",
    icon: "Receipt",
  },
  {
    label: "Status-Tracking",
    description: "Arbeitszeiten projektbezogen erfassen und auswerten.",
    icon: "Clock",
  },
  {
    label: "Mitarbeiterverwaltung",
    description: "Mitarbeitende, Qualifikationen und Einsatzplaene verwalten.",
    icon: "Users",
  },
];

const digitalSignature: TradeFeatureItem = {
  label: "Digitale Unterschrift",
  description: "Dokumente und Protokolle digital unterschreiben lassen.",
  icon: "PenLine",
};

const tradesDe: Trade[] = [
  {
    icon: Flame,
    slug: "kaminfeger",
    name: "Kaminfeger",
    tabLabel: "Kaminfeger",
    description:
      "Kehrbezirke digital verwalten, Pruefprotokolle erstellen und Messgeraete anbinden.",
    stats: [
      { value: "85%", label: "weniger Papierkram" },
      { value: "< 2 Min", label: "pro Protokoll" },
      { value: "100%", label: "KUEO-konform" },
    ],
    tradeFeatures: [
      {
        label: "Kehrbezirksverwaltung & Hausakten",
        description: "Verwaltung von Liegenschaften, Feuerstaettenbescheiden und Anlagen.",
        icon: "MapPin",
      },
      {
        label: "Messgeraeteschnittstelle",
        description: "Automatische Uebernahme von Messergebnissen aus dem Messgeraet.",
        icon: "Gauge",
      },
      {
        label: "Gebuehrenautomatik",
        description: "Automatische Berechnung von Grund- und Messgebuehren nach KUEO.",
        icon: "Calculator",
      },
      {
        label: "Feuerstaettenbescheid-Erstellung",
        description: "Digitale Erstellung und Verwaltung von Feuerstaettenbescheiden.",
        icon: "FileCheck",
      },
      {
        label: "Kehr- & Pruefprotokolle",
        description: "Normkonforme Protokolle fuer Kehrungen und Ueberpruefungen.",
        icon: "ClipboardCheck",
      },
      {
        label: "Routenplanung",
        description: "Optimierte Tourenplanung fuer Kehrbezirke mit Kartenansicht.",
        icon: "Route",
      },
      {
        label: "Berichte & Fristen",
        description: "Befunde erfassen, Fristen ueberwachen und Nachkontrollen planen.",
        icon: "Shield",
      },
      {
        label: "Statistiken & Auswertungen",
        description: "Kehrbezirksanalyse, Umsatzuebersicht und Leistungsreports.",
        icon: "BarChart3",
      },
    ],
    coreFeatures: [...coreBase, digitalSignature],
  },
  {
    icon: Paintbrush,
    slug: "maler",
    name: "Maler & Tapezierer",
    tabLabel: "Maler",
    description:
      "Flaechen digital kalkulieren, GAEB-Ausschreibungen importieren und Ressourcen steuern.",
    stats: [
      { value: "3x", label: "schnellere Kalkulation" },
      { value: "GAEB", label: "Import & Export" },
      { value: "RAL/NCS", label: "Farbtonsysteme" },
    ],
    tradeFeatures: [
      {
        label: "Flaechenkalkulation",
        description: "m2-basierte Preiskalkulation fuer Maler- und Lackierarbeiten.",
        icon: "Ruler",
      },
      {
        label: "GAEB-Unterstuetzung",
        description: "Import und Export von GAEB-Dateien fuer Ausschreibungen.",
        icon: "FileSpreadsheet",
      },
      {
        label: "Digitale Projektmappen",
        description: "Alle Projektdokumente, Plaene und Fotos an einem Ort.",
        icon: "FolderOpen",
      },
      {
        label: "Mitarbeiterverwaltung",
        description:
          "Stammdaten, Qualifikationen und Verfuegbarkeit — Grundlage fuer die Terminplanung.",
        icon: "Users",
      },
      {
        label: "Terminplanung",
        description:
          "Einsaetze, Kundenbesuche und Teamkapazitaeten in einer Plantafel buchen.",
        icon: "CalendarDays",
      },
      {
        label: "Untergrundpruefung & Schichtaufbau",
        description: "Dokumentation von Untergruenden und Beschichtungssystemen.",
        icon: "Layers",
      },
      {
        label: "Ressourcenmanagement & Grosshandel",
        description: "DATANORM- und IDS-CONNECT-Import von Artikellisten und Preisen.",
        icon: "PackageSearch",
      },
      {
        label: "DATEV-Schnittstelle",
        description: "Buchhaltungsexport im DATEV-Format fuer den Steuerberater.",
        icon: "FileOutput",
      },
      {
        label: "Farbtonverwaltung",
        description: "RAL- und NCS-Farbtonsysteme fuer praezise Farbauswahl.",
        icon: "Palette",
      },
      {
        label: "Raumbuch & Leistungsverzeichnis",
        description: "Raumweise Erfassung von Flaechen und automatische LV-Erstellung.",
        icon: "Building2",
      },
    ],
    coreFeatures: [...coreBase, digitalSignature],
  },
  {
    icon: Droplet,
    slug: "shk",
    name: "Sanitaer, Heizung, Klima",
    tabLabel: "SHK",
    description:
      "Heizlast nach DIN berechnen, Wartungsvertraege managen und Grosshaendler anbinden.",
    highlight: "KI-gestuetzte Wartung",
    stats: [
      { value: "DIN", label: "EN 12831 konform" },
      { value: "40%", label: "weniger Ausfaelle" },
      { value: "IDS/OCI", label: "Grosshaendler-Anbindung" },
    ],
    tradeFeatures: [
      {
        label: "Technische Planung & Kalkulation",
        description:
          "Heizlastberechnung (DIN EN 12831), Rohrnetzberechnung und Heizkoerperauslegung.",
        icon: "Thermometer",
      },
      {
        label: "Warenwirtschaft & Grosshaendler",
        description: "Anbindung an Grosshaendler via IDS Connect, OCI, UGL und DATANORM.",
        icon: "ShoppingCart",
      },
      {
        label: "Wartungsverwaltung & Ersatzteil-Suche",
        description:
          "Wartungsvertraege, Ersatzteile und Serviceberichte fuer technische Anlagen.",
        icon: "Wrench",
      },
      {
        label: "Predictive Maintenance (KI)",
        description: "Vorausschauende Wartung fuer Heizungs- und Klimaanlagen mittels KI.",
        icon: "BrainCircuit",
      },
      {
        label: "VOB-konforme Flaechenerfassung",
        description:
          "Flaechenerfassung und Abrechnung nach VOB fuer Installationsarbeiten.",
        icon: "Ruler",
      },
      {
        label: "Digitale Serviceberichte",
        description: "Serviceberichte digital erstellen, unterschreiben und versenden.",
        icon: "FileCheck",
      },
      {
        label: "Anlagen-Scan & Typenschilder",
        description:
          "Typenschilder per Kamera scannen und Anlagendaten automatisch erfassen.",
        icon: "Scan",
      },
      {
        label: "Normen & Regelwerk-Datenbank",
        description:
          "Zugriff auf aktuelle DIN-, DVGW- und VDI-Richtlinien direkt im System.",
        icon: "FileText",
      },
    ],
    coreFeatures: [...coreBase],
  },
];

const secondaryTradesDe: SecondaryTrade[] = [
  { icon: Plug, name: "Elektriker", comingSoon: true },
  { icon: TreePine, name: "Schreiner", comingSoon: true },
  { icon: HardHat, name: "Dachdecker", comingSoon: true },
  { icon: Wrench, name: "Sanitaer", comingSoon: true },
];

const tradesEn: Trade[] = [
  {
    icon: Flame,
    slug: "kaminfeger",
    name: "Chimney sweep",
    tabLabel: "Chimney sweep",
    description:
      "Manage sweep districts digitally, create inspection reports, and connect measuring devices.",
    stats: [
      { value: "85%", label: "less paperwork" },
      { value: "< 2 min", label: "per report" },
      { value: "100%", label: "KUEO compliant" },
    ],
    tradeFeatures: [
      {
        label: "Sweep district and property records",
        description: "Manage properties, fireplace notices, and systems.",
        icon: "MapPin",
      },
      {
        label: "Measurement device interface",
        description: "Automatically transfer readings from measuring devices.",
        icon: "Gauge",
      },
      {
        label: "Fee automation",
        description: "Automatic calculation of base and measurement fees according to KUEO.",
        icon: "Calculator",
      },
      {
        label: "Fireplace notice creation",
        description: "Create and manage fireplace notices digitally.",
        icon: "FileCheck",
      },
      {
        label: "Sweep and inspection reports",
        description: "Standards-compliant reports for sweeping and inspections.",
        icon: "ClipboardCheck",
      },
      {
        label: "Route planning",
        description: "Optimized route planning for districts with map view.",
        icon: "Route",
      },
      {
        label: "Reports and deadlines",
        description: "Capture findings, monitor deadlines, and plan follow-up checks.",
        icon: "Shield",
      },
      {
        label: "Statistics and analytics",
        description: "District analytics, revenue overview, and performance reports.",
        icon: "BarChart3",
      },
    ],
    coreFeatures: [
      {
        label: "Mobile app",
        description: "All features available on mobile while on the move.",
        icon: "Smartphone",
      },
      {
        label: "Digital documentation & photo upload",
        description: "Capture photos, notes, and documents directly on site.",
        icon: "Camera",
      },
      {
        label: "Scheduling / Digital planning board",
        description: "Plan and assign appointments and field jobs clearly.",
        icon: "CalendarDays",
      },
      {
        label: "Quoting & invoicing",
        description: "Create and send documents digitally.",
        icon: "Receipt",
      },
      {
        label: "Status tracking",
        description: "Track working time per project and evaluate progress.",
        icon: "Clock",
      },
      {
        label: "Employee management",
        description: "Manage employees, qualifications, and schedules.",
        icon: "Users",
      },
      {
        label: "Digital signature",
        description: "Collect digital signatures on reports and documents.",
        icon: "PenLine",
      },
    ],
  },
  {
    icon: Paintbrush,
    slug: "maler",
    name: "Painter & decorator",
    tabLabel: "Painter",
    description:
      "Calculate areas digitally, import GAEB tenders, and control resources.",
    stats: [
      { value: "3x", label: "faster costing" },
      { value: "GAEB", label: "import & export" },
      { value: "RAL/NCS", label: "color systems" },
    ],
    tradeFeatures: [
      {
        label: "Area costing",
        description: "m²-based price calculation for painting and coating work.",
        icon: "Ruler",
      },
      {
        label: "GAEB support",
        description: "Import and export GAEB files for tenders.",
        icon: "FileSpreadsheet",
      },
      {
        label: "Digital project folders",
        description: "All project documents, plans, and photos in one place.",
        icon: "FolderOpen",
      },
      {
        label: "Employee management",
        description:
          "Master data, qualifications, and availability — the basis for scheduling.",
        icon: "Users",
      },
      {
        label: "Scheduling",
        description:
          "Book field jobs, customer visits, and team capacity on one planning board.",
        icon: "CalendarDays",
      },
      {
        label: "Substrate checks & coating layers",
        description: "Document substrates and coating systems.",
        icon: "Layers",
      },
      {
        label: "Resource management & wholesale",
        description: "Import product lists and prices via DATANORM and IDS CONNECT.",
        icon: "PackageSearch",
      },
      {
        label: "DATEV interface",
        description: "Export accounting data in DATEV format for tax advisory.",
        icon: "FileOutput",
      },
      {
        label: "Color management",
        description: "RAL and NCS systems for precise color selection.",
        icon: "Palette",
      },
      {
        label: "Room book & bill of quantities",
        description: "Room-level area capture and automatic BOQ generation.",
        icon: "Building2",
      },
    ],
    coreFeatures: [
      {
        label: "Mobile app",
        description: "All features available on mobile while on the move.",
        icon: "Smartphone",
      },
      {
        label: "Digital documentation & photo upload",
        description: "Capture photos, notes, and documents directly on site.",
        icon: "Camera",
      },
      {
        label: "Scheduling / Digital planning board",
        description: "Plan and assign appointments and field jobs clearly.",
        icon: "CalendarDays",
      },
      {
        label: "Quoting & invoicing",
        description: "Create and send documents digitally.",
        icon: "Receipt",
      },
      {
        label: "Status tracking",
        description: "Track working time per project and evaluate progress.",
        icon: "Clock",
      },
      {
        label: "Employee management",
        description: "Manage employees, qualifications, and schedules.",
        icon: "Users",
      },
      {
        label: "Digital signature",
        description: "Collect digital signatures on reports and documents.",
        icon: "PenLine",
      },
    ],
  },
  {
    icon: Droplet,
    slug: "shk",
    name: "HVAC",
    tabLabel: "HVAC",
    description:
      "Calculate heat load by DIN, manage maintenance contracts, and connect wholesalers.",
    highlight: "AI-supported maintenance",
    stats: [
      { value: "DIN", label: "EN 12831 compliant" },
      { value: "40%", label: "fewer failures" },
      { value: "IDS/OCI", label: "wholesale integration" },
    ],
    tradeFeatures: [
      {
        label: "Technical planning & costing",
        description:
          "Heat load calculation (DIN EN 12831), pipe network sizing, and radiator selection.",
        icon: "Thermometer",
      },
      {
        label: "Inventory & wholesale",
        description: "Connect wholesalers via IDS Connect, OCI, UGL, and DATANORM.",
        icon: "ShoppingCart",
      },
      {
        label: "Maintenance management & spare part lookup",
        description:
          "Maintenance contracts, spare parts, and service reports for technical assets.",
        icon: "Wrench",
      },
      {
        label: "Predictive maintenance (AI)",
        description: "Predictive maintenance for heating and HVAC systems with AI.",
        icon: "BrainCircuit",
      },
      {
        label: "VOB-compliant area measurement",
        description: "Area measurement and billing according to VOB for installations.",
        icon: "Ruler",
      },
      {
        label: "Digital service reports",
        description: "Create, sign, and send service reports digitally.",
        icon: "FileCheck",
      },
      {
        label: "Asset scan & nameplates",
        description:
          "Scan nameplates by camera and capture asset data automatically.",
        icon: "Scan",
      },
      {
        label: "Standards & regulations database",
        description:
          "Access up-to-date DIN, DVGW, and VDI standards directly in the system.",
        icon: "FileText",
      },
    ],
    coreFeatures: [
      {
        label: "Mobile app",
        description: "All features available on mobile while on the move.",
        icon: "Smartphone",
      },
      {
        label: "Digital documentation & photo upload",
        description: "Capture photos, notes, and documents directly on site.",
        icon: "Camera",
      },
      {
        label: "Scheduling / Digital planning board",
        description: "Plan and assign appointments and field jobs clearly.",
        icon: "CalendarDays",
      },
      {
        label: "Quoting & invoicing",
        description: "Create and send documents digitally.",
        icon: "Receipt",
      },
      {
        label: "Status tracking",
        description: "Track working time per project and evaluate progress.",
        icon: "Clock",
      },
      {
        label: "Employee management",
        description: "Manage employees, qualifications, and schedules.",
        icon: "Users",
      },
    ],
  },
];

const secondaryTradesEn: SecondaryTrade[] = [
  { icon: Plug, name: "Electrician", comingSoon: true },
  { icon: TreePine, name: "Carpenter", comingSoon: true },
  { icon: HardHat, name: "Roofer", comingSoon: true },
  { icon: Wrench, name: "Sanitary", comingSoon: true },
];

export function getTrades(locale: Locale): Trade[] {
  return locale === "en" ? tradesEn : tradesDe;
}

export function getSecondaryTrades(locale: Locale): SecondaryTrade[] {
  return locale === "en" ? secondaryTradesEn : secondaryTradesDe;
}

function getRuntimeLocale(): Locale {
  if (typeof document === "undefined") return "de";
  return normalizeLocale(document.documentElement.lang) ?? "de";
}

export const trades = new Proxy([] as Trade[], {
  get(_target, property) {
    const currentTrades = getTrades(getRuntimeLocale());
    const value = currentTrades[property as keyof Trade[]];
    if (typeof value === "function") return value.bind(currentTrades);
    return value;
  },
  ownKeys() {
    return Reflect.ownKeys(getTrades(getRuntimeLocale()));
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  },
});

export const secondaryTrades = new Proxy([] as SecondaryTrade[], {
  get(_target, property) {
    const currentTrades = getSecondaryTrades(getRuntimeLocale());
    const value = currentTrades[property as keyof SecondaryTrade[]];
    if (typeof value === "function") return value.bind(currentTrades);
    return value;
  },
  ownKeys() {
    return Reflect.ownKeys(getSecondaryTrades(getRuntimeLocale()));
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  },
});
