export type AreaRectInput = {
  lengthM: string;
  widthM: string;
  qty: string;
};

export type AreaMetricsInput = {
  surfaces: AreaRectInput[];
  deductions: AreaRectInput[];
  surchargePercent: string;
  coverageM2PerL: string;
  coats: string;
  wastePercent: string;
  productivityM2PerH: string;
  setupHours: string;
};

export function parseNumberLike(raw: string): number | null {
  const cleaned = raw.trim().replace(",", ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function parseNonNegative(raw: string): number | null {
  const n = parseNumberLike(raw);
  if (n === null) return null;
  if (n < 0) return null;
  return n;
}

export function parsePositive(raw: string): number | null {
  const n = parseNumberLike(raw);
  if (n === null) return null;
  if (n <= 0) return null;
  return n;
}

export function parseNonNegativeInt(raw: string): number | null {
  const n = parseNumberLike(raw);
  if (n === null) return null;
  const i = Math.trunc(n);
  if (!Number.isFinite(i) || i < 0) return null;
  return i;
}

export function rectArea(row: AreaRectInput): { area: number; valid: boolean } {
  const length = parseNonNegative(row.lengthM);
  const width = parseNonNegative(row.widthM);
  const qty = parseNonNegativeInt(row.qty);
  const valid = length !== null && width !== null && qty !== null;
  const area = (length ?? 0) * (width ?? 0) * (qty ?? 0);
  return { area, valid };
}

export function calculateAreaMetrics(input: AreaMetricsInput) {
  const surfaces = input.surfaces.map(rectArea);
  const deductions = input.deductions.map(rectArea);

  const surfacesArea = surfaces.reduce((a, b) => a + b.area, 0);
  const deductionsArea = deductions.reduce((a, b) => a + b.area, 0);
  const netArea = Math.max(0, surfacesArea - deductionsArea);

  const surcharge = parseNonNegative(input.surchargePercent) ?? 0;
  const grossArea = netArea * (1 + surcharge / 100);

  const coverage = parsePositive(input.coverageM2PerL) ?? 8;
  const coats = parseNonNegativeInt(input.coats) ?? 2;
  const waste = parseNonNegative(input.wastePercent) ?? 10;
  const liters = (grossArea / coverage) * Math.max(1, coats) * (1 + waste / 100);

  const productivity = parsePositive(input.productivityM2PerH) ?? 20;
  const setup = parseNonNegative(input.setupHours) ?? 0;
  const hours = grossArea / productivity + setup;
  const buckets = liters > 0 ? Math.ceil(liters / 12.5) : 0;

  return {
    surfaces,
    deductions,
    surfacesArea,
    deductionsArea,
    netArea,
    grossArea,
    liters,
    hours,
    buckets,
  };
}
