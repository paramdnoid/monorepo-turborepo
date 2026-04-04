import type { NcsEntry, RalClassicEntry } from "./types";

const MAX_RESULTS = 1200;

function norm(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, " ");
}

function compact(s: string): string {
  return s.replace(/\s/g, "").toUpperCase();
}

export function filterRalCatalog(
  entries: readonly RalClassicEntry[],
  query: string,
): RalClassicEntry[] {
  const q = norm(query);
  if (!q) return [...entries];
  const qc = compact(q);
  return entries.filter((e) => {
    const code = norm(e.code);
    const hex = e.hex.replace("#", "").toUpperCase();
    return (
      code.includes(q) ||
      compact(code).includes(qc) ||
      hex.includes(qc) ||
      code.replace(/^RAL\s*/i, "").includes(q.replace(/^RAL\s*/i, ""))
    );
  });
}

export function filterNcsCatalog(
  entries: readonly NcsEntry[],
  query: string,
): NcsEntry[] {
  const q = norm(query);
  if (!q) return [...entries];
  const qc = compact(q);
  const filtered = entries.filter((e) => {
    const n = norm(e.notation);
    const hex = e.hex.replace("#", "").toUpperCase();
    return (
      n.includes(q) ||
      compact(n).includes(qc) ||
      hex.includes(qc)
    );
  });
  return filtered.slice(0, MAX_RESULTS);
}
