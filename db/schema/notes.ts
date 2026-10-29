import { integer, sqliteTable, text } from "void/schema-d1";

/**
 * Notes. createdAt is an ISO string, so the strings sort in time order; a note lives 25 minutes from it (notes.service.ts).
 * author is the name of who wrote it.
 */
export const notes = sqliteTable("notes", {
  id: integer().primaryKey({ autoIncrement: true }),
  text: text().notNull(),
  createdAt: text().notNull(),
  author: text().notNull(),
});
