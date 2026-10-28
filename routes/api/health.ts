import { sql } from "drizzle-orm";
import { defineHandler } from "void";

import { db } from "@db/client.ts";

/** GET /api/health: `{ ok: true }` after a SELECT 1. The request log and the rate limit skip it (middleware/). */
export const GET = defineHandler(() => {
  db.get(sql`SELECT 1`);
  return { ok: true };
});
