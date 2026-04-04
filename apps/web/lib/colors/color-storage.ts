import type { ColorSystemId, StoredColorRef } from "./types";

const FAV_KEY = "zgwerk-web-color-favorites-v1";
const RECENT_KEY = "zgwerk-web-color-recent-v1";
const RECENT_MAX = 10;

function readJson(key: string): unknown {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function isStoredRef(x: unknown): x is StoredColorRef {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    (o.system === "ral" || o.system === "ncs") && typeof o.id === "string"
  );
}

export function loadFavorites(): StoredColorRef[] {
  const data = readJson(FAV_KEY);
  if (!Array.isArray(data)) return [];
  return data.filter(isStoredRef);
}

export function saveFavorites(refs: StoredColorRef[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAV_KEY, JSON.stringify(refs));
}

export function loadRecent(): StoredColorRef[] {
  const data = readJson(RECENT_KEY);
  if (!Array.isArray(data)) return [];
  return data.filter(isStoredRef);
}

export function pushRecent(system: ColorSystemId, id: string): void {
  if (typeof window === "undefined") return;
  const prev = loadRecent();
  const next: StoredColorRef[] = [
    { system, id },
    ...prev.filter((r) => !(r.system === system && r.id === id)),
  ].slice(0, RECENT_MAX);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function toggleFavorite(
  favorites: StoredColorRef[],
  system: ColorSystemId,
  id: string,
): StoredColorRef[] {
  const exists = favorites.some((r) => r.system === system && r.id === id);
  if (exists) {
    return favorites.filter((r) => !(r.system === system && r.id === id));
  }
  return [...favorites, { system, id }];
}
