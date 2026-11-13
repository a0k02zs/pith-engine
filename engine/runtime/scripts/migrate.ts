// Applies engine/db/001_core.sql (only to a database that has no engine tables) and engine/db/002_runtime.sql.
// Usage: DATABASE_URL=postgres://... node scripts/migrate.ts
// You can run this script again. The second run changes nothing.
import { applySchema, PgStore } from "../src/pg-store.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] set DATABASE_URL");
  process.exit(1);
}
const pool = PgStore.pool(url);
try {
  await applySchema(pool, { withoutVector: process.env.PITH_DB_NO_VECTOR === "1" });
  console.log("[migrate] the schema 'engine' is current");
} catch (e) {
  console.error(`[migrate] ${e instanceof Error ? e.message : e}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
