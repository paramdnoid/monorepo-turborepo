/** Basis-URL der Marketing-Website (Landing); gleiche Variable wie in `apps/web`. */
export function getMarketingSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://zunftgewerk.de";
}
