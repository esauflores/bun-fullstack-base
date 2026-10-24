import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { config } from "@/api/core/config.ts";

/**
 * A consistent copy of the database, taken while the server runs. VACUUM INTO writes one file that includes the changes
 * still in the WAL, which copying app.db alone would miss. `bun run backup [dir]` writes app-<time>.db into dir
 * (backups/ by default), from DATABASE_PATH.
 */
const dir = resolve(process.argv[2] ?? "backups");
mkdirSync(dir, { recursive: true });

const target = join(dir, `app-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
const db = new Database(config().DATABASE_PATH);
try {
  db.run("VACUUM INTO ?", [target]);
} finally {
  db.close();
}
console.log(`Backed up to ${target}`);
