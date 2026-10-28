import { defineConfig } from "drizzle-kit";

/** `bun run db:generate` compares the tables (db/schema/) with the last migration and writes a new one into
 * db/migrations/, which db/client.ts applies. */
export default defineConfig({
  dialect: "sqlite",
  schema: "./db/schema/*.ts",
  out: "./db/migrations",
});
