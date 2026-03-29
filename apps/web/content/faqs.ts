import { type Locale, normalizeLocale } from "@/lib/i18n/locale"

type FaqEntry = { question: string; answer: string }

const faqsDe: FaqEntry[] = [
  {
    question: "Was ist ZunftGewerk?",
    answer:
      "ZunftGewerk ist eine All-in-One Software fuer Handwerksbetriebe von Einsatzplanung bis Rechnung.",
  },
  {
    question: "Kann ich ZunftGewerk kostenlos testen?",
    answer:
      "Ja, 30 Tage Testphase ohne Kreditkarte mit vollem Funktionsumfang des gewaehlten Plans.",
  },
  {
    question: "Ist ZunftGewerk DSGVO-konform?",
    answer:
      "Ja. Daten werden in Deutschland gehostet und verschluesselt verarbeitet.",
  },
  {
    question: "Funktioniert die Plattform auch offline?",
    answer:
      "Ja. Daten werden lokal zwischengespeichert und bei Verbindung automatisch synchronisiert.",
  },
]

const faqsEn: FaqEntry[] = [
  {
    question: "What is ZunftGewerk?",
    answer:
      "ZunftGewerk is an all-in-one software platform for trades businesses, from scheduling to invoicing.",
  },
  {
    question: "Can I try ZunftGewerk for free?",
    answer: "Yes, 30-day trial without credit card with full access to the selected plan.",
  },
  {
    question: "Is ZunftGewerk GDPR compliant?",
    answer: "Yes. Data is hosted in Germany and processed with encryption.",
  },
  {
    question: "Does the platform work offline?",
    answer:
      "Yes. Data is cached locally and synchronized automatically once a connection is available.",
  },
]

export function getFaqs(locale: Locale): FaqEntry[] {
  return locale === "en" ? faqsEn : faqsDe
}

function getRuntimeLocale(): Locale {
  if (typeof document === "undefined") return "de"
  return normalizeLocale(document.documentElement.lang) ?? "de"
}

export const faqs = new Proxy([] as FaqEntry[], {
  get(_target, property) {
    const currentFaqs = getFaqs(getRuntimeLocale())
    const value = currentFaqs[property as keyof FaqEntry[]]
    if (typeof value === "function") return value.bind(currentFaqs)
    return value
  },
  ownKeys() {
    return Reflect.ownKeys(getFaqs(getRuntimeLocale()))
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true }
  },
})
