import { type Locale, normalizeLocale } from "@/lib/i18n/locale"

export interface Step {
  step: string;
  title: string;
  description: string;
}

const stepsDe: Step[] = [
  { step: "01", title: "Registrieren", description: "Konto in wenigen Minuten erstellen." },
  { step: "02", title: "Einrichten", description: "Gewerk waehlen und Stammdaten importieren." },
  { step: "03", title: "Loslegen", description: "Ersten Auftrag planen und abrechnen." },
];

const stepsEn: Step[] = [
  { step: "01", title: "Sign up", description: "Create your account in just a few minutes." },
  { step: "02", title: "Set up", description: "Choose your trade and import master data." },
  { step: "03", title: "Get started", description: "Plan and bill your first job." },
];

export function getSteps(locale: Locale): Step[] {
  return locale === "en" ? stepsEn : stepsDe
}

function getRuntimeLocale(): Locale {
  if (typeof document === "undefined") return "de"
  return normalizeLocale(document.documentElement.lang) ?? "de"
}

export const steps = new Proxy([] as Step[], {
  get(_target, property) {
    const currentSteps = getSteps(getRuntimeLocale())
    const value = currentSteps[property as keyof Step[]]
    if (typeof value === "function") return value.bind(currentSteps)
    return value
  },
  ownKeys() {
    return Reflect.ownKeys(getSteps(getRuntimeLocale()))
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true }
  },
})
