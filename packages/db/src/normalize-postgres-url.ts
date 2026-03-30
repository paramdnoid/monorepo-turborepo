/**
 * Entfernt ein leeres Passwort-Segment (`postgresql://user:@host`), damit `pg`
 * bei SCRAM ein definiertes Passwort sieht (sonst: „client password must be a string“).
 */
export function normalizePostgresConnectionString(url: string): string {
  return url.replace(/^(postgres(?:ql)?:\/\/)([^/@]+):(?=@)/, "$1$2");
}
