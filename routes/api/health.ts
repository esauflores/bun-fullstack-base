import { defineHandler } from "void";
import { db, sql } from "void/db";

/** GET /api/health: `{ ok: true }` after a SELECT 1 on D1. The request log skips it (middleware/). */
export const GET = defineHandler(async () => {
  await db.run(sql`SELECT 1`);
  return { ok: true };
});
