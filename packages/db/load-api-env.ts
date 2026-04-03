import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dbPackageRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Lädt `.env` und `.env.local` am Repository-Root (wie `apps/api/src/server.ts`), damit
 * `db:migrate` / optional `db:seed` dieselbe `DATABASE_URL` verwenden.
 * Pfad relativ zu diesem Paket: `packages/db` → `../..` (Monorepo-Root).
 */
export function loadApiEnv(): void {
  const repoRoot = join(dbPackageRoot, "../..");
  const envPath = join(repoRoot, ".env");
  const envLocalPath = join(repoRoot, ".env.local");

  if (existsSync(envPath)) {
    config({ path: envPath });
  }
  if (existsSync(envLocalPath)) {
    config({ path: envLocalPath, override: true });
  }
}
