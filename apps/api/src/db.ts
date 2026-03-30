import { createDb, createPool, type Db } from "@repo/db";

let pool: ReturnType<typeof createPool> | undefined;
let db: Db | undefined;

export function getOptionalDb(): Db | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (!pool) {
    pool = createPool(url);
    db = createDb(pool);
  }
  return db;
}
