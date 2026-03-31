import { faqsDe, faqsEn, type FaqEntry } from "@/content/faq-entries";
import { type Locale, normalizeLocale } from "@/lib/i18n/locale";

export type { FaqEntry } from "@/content/faq-entries";

/** Flacht FAQ-Antworten zu einem String fuer schema.org FAQPage (acceptedAnswer.text). */
export function faqAnswerForJsonLd(answer: string): string {
  return answer
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
}

export function getFaqs(locale: Locale): FaqEntry[] {
  return locale === "en" ? faqsEn : faqsDe;
}

function getRuntimeLocale(): Locale {
  if (typeof document === "undefined") return "de";
  return normalizeLocale(document.documentElement.lang) ?? "de";
}

export const faqs = new Proxy([] as FaqEntry[], {
  get(_target, property) {
    const currentFaqs = getFaqs(getRuntimeLocale());
    const value = currentFaqs[property as keyof FaqEntry[]];
    if (typeof value === "function") return value.bind(currentFaqs);
    return value;
  },
  ownKeys() {
    return Reflect.ownKeys(getFaqs(getRuntimeLocale()));
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  },
});
