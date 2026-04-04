export type PainterMaterialProfile = {
  id: string;
  labelDe: string;
  labelEn: string;
  coverageM2PerL: number;
  productivityM2PerH: number;
  wastePercent: number;
  coats: number;
};

export const PAINTER_MATERIAL_PROFILES: readonly PainterMaterialProfile[] = [
  {
    id: "interior-dispersion",
    labelDe: "Innenwandfarbe (Dispersionsfarbe)",
    labelEn: "Interior wall paint (dispersion)",
    coverageM2PerL: 8,
    productivityM2PerH: 22,
    wastePercent: 8,
    coats: 2,
  },
  {
    id: "facade-silicone",
    labelDe: "Fassadenfarbe (Silikonharz)",
    labelEn: "Facade paint (silicone resin)",
    coverageM2PerL: 6,
    productivityM2PerH: 14,
    wastePercent: 12,
    coats: 2,
  },
  {
    id: "primer-deep",
    labelDe: "Tiefgrund / Grundierung",
    labelEn: "Primer / deep primer",
    coverageM2PerL: 10,
    productivityM2PerH: 26,
    wastePercent: 5,
    coats: 1,
  },
  {
    id: "wood-lacquer",
    labelDe: "Holzlack wasserbasiert",
    labelEn: "Water-based wood lacquer",
    coverageM2PerL: 9,
    productivityM2PerH: 12,
    wastePercent: 10,
    coats: 2,
  },
];

export function findPainterMaterialProfile(
  id: string,
): PainterMaterialProfile | null {
  return PAINTER_MATERIAL_PROFILES.find((entry) => entry.id === id) ?? null;
}
