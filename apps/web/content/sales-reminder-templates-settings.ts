import type { Locale } from "@/lib/i18n/locale";

export type SalesReminderTemplatesSettingsCopy = {
  cardTitle: string;
  cardDescription: string;
  placeholdersHint: string;
  localeDe: string;
  localeEn: string;
  levelLabel: (n: number) => string;
  bodyHint: string;
  feeLabel: string;
  feeHint: string;
  save: string;
  loading: string;
  loadFailed: string;
  retry: string;
  saved: string;
  saveFailed: string;
};

const de: SalesReminderTemplatesSettingsCopy = {
  cardTitle: "Mahntexte & Mahngebuehr",
  cardDescription:
    "Fließtext pro Mahnstufe (1–10) und Sprache. Leeres Feld: Standardformulierung. Optionale Mahngebuehr erscheint in PDF und Druckansicht.",
  placeholdersHint:
    "Platzhalter: {{invoiceNumber}}, {{customerName}}, {{dueDate}}, {{openBalance}}, {{total}}, {{reminderLevel}}, {{reminderDate}}",
  localeDe: "Deutsch",
  localeEn: "Englisch",
  levelLabel: (n) => `Stufe ${n}`,
  bodyHint: "Standardtext der Anwendung, wenn dieses Feld leer bleibt.",
  feeLabel: "Mahngebuehr (optional)",
  feeHint: "Nettobetrag; eine Zeile unter dem Fließtext (PDF/Druck).",
  save: "Mahntexte speichern",
  loading: "Laden…",
  loadFailed: "Die Vorlagen konnten nicht geladen werden.",
  retry: "Erneut versuchen",
  saved: "Mahntexte gespeichert.",
  saveFailed: "Speichern fehlgeschlagen.",
};

const en: SalesReminderTemplatesSettingsCopy = {
  cardTitle: "Reminder wording & fee",
  cardDescription:
    "Intro text per reminder level (1–10) and language. Empty field: default copy. Optional reminder fee appears in PDF and print.",
  placeholdersHint:
    "Placeholders: {{invoiceNumber}}, {{customerName}}, {{dueDate}}, {{openBalance}}, {{total}}, {{reminderLevel}}, {{reminderDate}}",
  localeDe: "German",
  localeEn: "English",
  levelLabel: (n) => `Level ${n}`,
  bodyHint: "Uses the built-in default if you leave this blank.",
  feeLabel: "Reminder fee (optional)",
  feeHint: "Net amount; one line below the intro (PDF/print).",
  save: "Save reminder texts",
  loading: "Loading…",
  loadFailed: "Could not load templates.",
  retry: "Retry",
  saved: "Saved.",
  saveFailed: "Save failed.",
};

export function getSalesReminderTemplatesSettingsCopy(
  locale: Locale,
): SalesReminderTemplatesSettingsCopy {
  return locale === "en" ? en : de;
}
