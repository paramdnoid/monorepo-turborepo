import path from "node:path";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  /** Absoluter oder relativer Pfad; in Produktion setzen. In Dev fallback `.local/project-assets` unter cwd. */
  PROJECT_ASSETS_DIR: z.string().optional(),
  /** Maximale Upload-Größe in MB (1–512), Default 25. */
  PROJECT_ASSETS_MAX_MB: z.string().optional(),
  AUTH_KEYCLOAK_BASE_URL: z.string().url().optional(),
  KEYCLOAK_BASE_URL: z.string().url().optional(),
  AUTH_KEYCLOAK_REALM: z.string().min(1).default("zgwerk"),
  AUTH_OIDC_ISSUER: z.string().url().optional(),
  AUTH_OIDC_AUDIENCE: z.string().min(1).optional(),
  AUTH_TENANT_CLAIM: z.string().min(1).default("tenant_id"),
});

export type LoadedEnv = z.infer<typeof envSchema>;

let cached: LoadedEnv | undefined;

export function loadEnv(): LoadedEnv {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}

export function resetEnvCacheForTests(): void {
  cached = undefined;
}

export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Wurzelverzeichnis für Projektmappe-Dateien.
 * Produktion: `PROJECT_ASSETS_DIR` setzen.
 * Development: optional — sonst `<cwd>/.local/project-assets`.
 */
export function resolveProjectAssetsRoot(): string | undefined {
  const env = loadEnv();
  const fromEnv = env.PROJECT_ASSETS_DIR?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  if (env.NODE_ENV === "production") {
    return undefined;
  }
  return path.resolve(process.cwd(), ".local/project-assets");
}

/** Issuer-URL wie von Keycloak ausgestellt (`iss` im JWT), z. B. `https://auth.example/realms/zgwerk`. */
export function resolveIssuer(env: LoadedEnv): string | undefined {
  if (env.AUTH_OIDC_ISSUER) return env.AUTH_OIDC_ISSUER;
  const base = env.AUTH_KEYCLOAK_BASE_URL ?? env.KEYCLOAK_BASE_URL;
  if (!base) return undefined;
  return `${normalizeBaseUrl(base)}/realms/${encodeURIComponent(env.AUTH_KEYCLOAK_REALM)}`;
}
