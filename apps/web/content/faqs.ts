import { type Locale, normalizeLocale } from "@/lib/i18n/locale";

type FaqEntry = { question: string; answer: string };

const faqsDe: FaqEntry[] = [
  {
    question: "Was ist ZunftGewerk?",
    answer:
      "ZunftGewerk ist eine All-in-One Software fuer Handwerksbetriebe von Einsatzplanung bis Rechnung. Sie verbindet Buero, Aussendienst und Dokumentation in einer Oberflaeche und ist fuer Kaminfeger, Maler sowie Sanitaer-, Heizungs- und Klima-Betriebe optimiert.",
  },
  {
    question: "Kann ich ZunftGewerk kostenlos testen?",
    answer:
      "Ja, 30 Tage Testphase ohne Kreditkarte mit vollem Funktionsumfang des gewaehlten Plans. Die Abrechnung startet erst nach Ende der Testphase.",
  },
  {
    question: "Ist ZunftGewerk DSGVO-konform?",
    answer:
      "Ja. Daten werden in Deutschland gehostet und verschluesselt verarbeitet. Die Plattform ist fuer die Verarbeitung personenbezogener Daten im Handwerkskontext ausgelegt.",
  },
  {
    question: "Funktioniert die Plattform auch offline?",
    answer:
      "Ja. Daten werden lokal zwischengespeichert und bei Verbindung automatisch synchronisiert, damit Sie auf Baustelle und unterwegs weiterarbeiten koennen.",
  },
  {
    question: "Welche Gewerke werden unterstuetzt?",
    answer:
      "Aktuell mit branchenspezifischen Funktionen: Kaminfeger, Maler und Tapezierer sowie Sanitaer, Heizung und Klima (SHK). Weitere Gewerke wie Elektriker, Schreiner oder Dachdecker sind in Planung.",
  },
  {
    question: "Was ist der Unterschied zwischen Starter und Professional?",
    answer:
      "Starter richtet sich an kleinere Betriebe mit bis zu fuenf Benutzern und 10 GB Speicher. Professional bietet mehr Platz, mehr Benutzer und zusaetzlich Schnittstellen wie DATEV und GAEB fuer wachsende Teams.",
  },
  {
    question: "Gibt es mobile und Desktop Apps?",
    answer:
      "Ja. Es gibt native Apps fuer iOS und Android fuer den Aussendienst sowie Desktop-Anwendungen fuer Windows, macOS und Linux fuer den Bueroalltag. Aenderungen synchronisieren ueber die Cloud.",
  },
  {
    question: "Wie werden Zahlungen abgewickelt?",
    answer:
      "Zahlungen laufen ueber Stripe. Sie hinterlegen eine Zahlungsmethode im Onboarding; es faellt erst nach Testphasenende eine Gebuehr an. Rechnungen stellen wir elektronisch bereit.",
  },
  {
    question: "Kann ich meine Daten exportieren oder kuendigen?",
    answer:
      "Ja. Sie koennen Ihr Abo zum Ende der Abrechnungsperiode kuendigen. Nach Vertragsende stellen wir Ihre Daten fuer einen Exportbereitstellungszeitraum zur Verfuegung; Details stehen in den AGB.",
  },
  {
    question: "Wer hilft mir bei Fragen zum Produkt?",
    answer:
      "Sie erreichen unseren Support unter support@zunftgewerk.de. Fuer Vertrags- und Datenschutzfragen finden Sie Impressum, AGB und Datenschutzerklaerung auf der Website.",
  },
  {
    question: "Welche Schnittstellen bietet ZunftGewerk?",
    answer:
      "Je nach Gewerk und Tarif unter anderem GAEB-Import und -Export, DATEV-Schnittstelle fuer die Buchhaltung, Anbindungen an Grosshaendler (z. B. IDS, OCI, DATANORM) sowie Messgeraete und typische Handwerks-Workflows.",
  },
  {
    question: "Wo liegen meine Daten?",
    answer:
      "Hosting in Deutschland, AES-256-GCM Verschluesselung fuer sensible Daten und Abrechnung erst nach Testphase. Details zur Verarbeitung finden Sie in der Datenschutzerklaerung.",
  },
];

const faqsEn: FaqEntry[] = [
  {
    question: "What is ZunftGewerk?",
    answer:
      "ZunftGewerk is an all-in-one software platform for trades businesses, from scheduling to invoicing. It connects office, field work, and documentation in one interface and is tailored for chimney sweeps, painters, and HVAC/plumbing trades.",
  },
  {
    question: "Can I try ZunftGewerk for free?",
    answer:
      "Yes, 30-day trial without credit card with full access to the selected plan. Billing starts only after the trial ends.",
  },
  {
    question: "Is ZunftGewerk GDPR compliant?",
    answer:
      "Yes. Data is hosted in Germany and processed with encryption. The platform is designed for processing personal data in a trades context.",
  },
  {
    question: "Does the platform work offline?",
    answer:
      "Yes. Data is cached locally and synchronized automatically once a connection is available so you can keep working on site and on the move.",
  },
  {
    question: "Which trades are supported?",
    answer:
      "Currently with trade-specific features: chimney sweeps, painters and decorators, and HVAC/plumbing (SHK). More trades such as electricians, carpenters, or roofers are planned.",
  },
  {
    question: "What is the difference between Starter and Professional?",
    answer:
      "Starter targets smaller teams with up to five users and 10 GB storage. Professional offers more capacity and users plus interfaces such as DATEV and GAEB for growing teams.",
  },
  {
    question: "Are there mobile and desktop apps?",
    answer:
      "Yes. Native iOS and Android apps for field teams and desktop apps for Windows, macOS, and Linux for office workflows. Changes sync via the cloud.",
  },
  {
    question: "How are payments handled?",
    answer:
      "Payments run through Stripe. You add a payment method during onboarding; charges apply only after the trial ends. Invoices are provided electronically.",
  },
  {
    question: "Can I export my data or cancel?",
    answer:
      "Yes. You can cancel at the end of the billing period. After the contract ends we provide data for export for a defined period; see the terms of service for details.",
  },
  {
    question: "Who can help with product questions?",
    answer:
      "Contact support@zunftgewerk.de. Legal imprint, terms, and privacy policy are linked on the website.",
  },
  {
    question: "Which integrations does ZunftGewerk offer?",
    answer:
      "Depending on trade and plan, including GAEB import/export, DATEV export for accounting, wholesale integrations (e.g. IDS, OCI, DATANORM), and trade-specific workflows.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "Hosting in Germany, AES-256-GCM encryption for sensitive data, and billing only after the trial. See the privacy policy for processing details.",
  },
];

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
