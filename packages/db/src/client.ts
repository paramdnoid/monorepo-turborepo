import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import { normalizePostgresConnectionString } from "./normalize-postgres-url.js";
import * as schema from "./schema.js";

export type Db = NodePgDatabase<typeof schema>;

export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({
    connectionString: normalizePostgresConnectionString(connectionString),
  });
}

export function createDb(pool: pg.Pool): Db {
  return drizzle(pool, { schema });
}
