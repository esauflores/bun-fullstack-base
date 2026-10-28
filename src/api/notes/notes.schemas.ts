import { z } from "zod";

/** The query that picks a page: `limit`, 1 to 100 (20 by default), and `before`, a page's `next`. */
export const NotesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  before: z.coerce.number().int().optional(),
});

/** The body that adds or changes a note: its text, trimmed, 1 to 500 characters. */
export const NewNoteSchema = z.object({ text: z.string().trim().min(1).max(500) });

/** A note's id, in the path: a positive whole number. */
export const NoteIdSchema = z.object({ id: z.coerce.number().int().positive() });
