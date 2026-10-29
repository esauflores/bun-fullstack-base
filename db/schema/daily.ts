import { sqliteTable, text } from "void/schema-d1";

/**
 * The daily cards, one per day (YYYY-MM-DD, UTC): the AI's text; its image is in storage at `daily/<date>.jpg`
 * (src/api/daily/daily.service.ts). The last 7 are kept.
 */
export const daily = sqliteTable("daily", {
  date: text().primaryKey(),
  text: text().notNull(),
  createdAt: text().notNull(),
});
