import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dbPackageRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Lädt `apps/api/.env` und `apps/api/.env.local` (wie die API), damit
 * `db:migrate` / `db:seed` dieselbe `DATABASE_URL` verwenden.
 * Pfad relativ zu diesem Paket: `packages/db` → `../../apps/api`.
 */
export function loadApiEnv(): void {
  const apiDir = join(dbPackageRoot, "../../apps/api");
  const envPath = join(apiDir, ".env");
  const envLocalPath = join(apiDir, ".env.local");

  if (existsSync(envPath)) {
    config({ path: envPath });
  }
  if (existsSync(envLocalPath)) {
    config({ path: envLocalPath, override: true });
  }
}
