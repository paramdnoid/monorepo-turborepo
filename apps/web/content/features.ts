import {
  CalendarDays,
  Camera,
  Clock,
  Cloud,
  type LucideIcon,
  Monitor,
  PenLine,
  Receipt,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { type Locale, normalizeLocale } from "@/lib/i18n/locale";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  benefits: string[];
}

const featuresDe: Feature[] = [
  {
    icon: Smartphone,
    title: "Mobile App",
    description: "iOS und Android fuer Einsaetze, Fotos und Signaturen vor Ort.",
    benefits: ["Einsaetze mobil bearbeiten", "Push-Benachrichtigungen", "Optimiert fuer Aussendienst"],
  },
  {
    icon: Monitor,
    title: "Desktop App",
    description: "Windows, macOS und Linux fuer Bueroablaeufe mit voller Funktionalitaet.",
    benefits: ["Volle Funktionalitaet", "Schnelle Dateneingabe", "Multi-Monitor geeignet"],
  },
  {
    icon: Cloud,
    title: "Cloud-Sync",
    description: "Daten sind auf allen Geraeten automatisch aktuell und verfuegbar.",
    benefits: ["Echtzeit-Sync", "Automatische Backups", "DSGVO Hosting in DE"],
  },
  {
    icon: PenLine,
    title: "Digitale Unterschrift",
    description: "Rechtssichere Signatur direkt auf Tablet oder Smartphone.",
    benefits: ["Rechtssicher", "Direkt vor Ort", "Sofortiger Versand"],
  },
  {
    icon: Camera,
    title: "Fotodokumentation",
    description: "Bilder werden direkt dem richtigen Auftrag zugeordnet.",
    benefits: ["Automatische Zuordnung", "Vorher/Nachher", "Zeitstempel"],
  },
  {
    icon: Clock,
    title: "Status und Zeiten",
    description: "Digitale Zeiterfassung mit Projektbezug fuer saubere Abrechnung.",
    benefits: ["Stempeluhr", "Projektzuordnung", "Exportierbar"],
  },
  {
    icon: Receipt,
    title: "Rechnungswesen",
    description: "Von Angebot bis Rechnung in einem einheitlichen Prozess.",
    benefits: ["Angebot zu Rechnung", "Standardkonforme Dokumente", "Mahnlaeufe"],
  },
  {
    icon: CalendarDays,
    title: "Terminplanung",
    description: "Plantafel mit Kalender und Erinnerungen fuer Mitarbeitende.",
    benefits: ["Drag und Drop", "Automatische Erinnerungen", "Kapazitaetsblick"],
  },
  {
    icon: WifiOff,
    title: "Offline-Modus",
    description: "Volle Nutzbarkeit auch ohne Internet, mit spaeterem Sync.",
    benefits: ["Arbeiten ohne Netz", "Automatischer Sync", "Keine Datenverluste"],
  },
];

const featuresEn: Feature[] = [
  {
    icon: Smartphone,
    title: "Mobile app",
    description: "iOS and Android for jobs, photos, and signatures on site.",
    benefits: ["Handle jobs on mobile", "Push notifications", "Optimized for field teams"],
  },
  {
    icon: Monitor,
    title: "Desktop app",
    description: "Windows, macOS, and Linux for office workflows with full functionality.",
    benefits: ["Full functionality", "Fast data entry", "Multi-monitor ready"],
  },
  {
    icon: Cloud,
    title: "Cloud sync",
    description: "Data is automatically up to date and available on all devices.",
    benefits: ["Real-time sync", "Automatic backups", "GDPR hosting in Germany"],
  },
  {
    icon: PenLine,
    title: "Digital signature",
    description: "Legally compliant signatures directly on tablet or smartphone.",
    benefits: ["Legally compliant", "On-site signature", "Instant delivery"],
  },
  {
    icon: Camera,
    title: "Photo documentation",
    description: "Images are directly linked to the correct work order.",
    benefits: ["Automatic assignment", "Before/after proof", "Timestamped"],
  },
  {
    icon: Clock,
    title: "Status and time tracking",
    description: "Digital time tracking with project reference for clean billing.",
    benefits: ["Time clock", "Project mapping", "Exportable"],
  },
  {
    icon: Receipt,
    title: "Invoicing",
    description: "From quote to invoice in one unified process.",
    benefits: ["Quote to invoice", "Standards-compliant documents", "Dunning flows"],
  },
  {
    icon: CalendarDays,
    title: "Scheduling",
    description: "Planning board with calendar and reminders for employees.",
    benefits: ["Drag and drop", "Automatic reminders", "Capacity visibility"],
  },
  {
    icon: WifiOff,
    title: "Offline mode",
    description: "Full usability without internet, with later synchronization.",
    benefits: ["Work offline", "Automatic sync", "No data loss"],
  },
];

export function getFeatures(locale: Locale): Feature[] {
  return locale === "en" ? featuresEn : featuresDe;
}

function getRuntimeLocale(): Locale {
  if (typeof document === "undefined") return "de";
  return normalizeLocale(document.documentElement.lang) ?? "de";
}

export const features = new Proxy([] as Feature[], {
  get(_target, property) {
    const currentFeatures = getFeatures(getRuntimeLocale());
    const value = currentFeatures[property as keyof Feature[]];
    if (typeof value === "function") return value.bind(currentFeatures);
    return value;
  },
  ownKeys() {
    return Reflect.ownKeys(getFeatures(getRuntimeLocale()));
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  },
});
