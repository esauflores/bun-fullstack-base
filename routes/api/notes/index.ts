import { defineHandler } from "void";
import { requireAuth } from "void/auth";

import { requireAdmin } from "@/api/auth/accounts.ts";
import { NewNoteSchema, NotesQuerySchema } from "@/api/notes/notes.schemas.ts";
import { addNote, listNotes, notesChanged } from "@/api/notes/notes.service.ts";

/**
 * GET /api/notes: a page of live notes, newest first, `?limit=` (20 by default) and `?before=` a page's `next`. Any
 * signed-in user (401 otherwise), as the live view; writes are the admin's.
 */
export const GET = defineHandler.withValidator({ query: NotesQuerySchema })((c, { query }) => {
  requireAuth(c);
  return listNotes(query);
});

/** POST /api/notes: adds a note, its text trimmed, and answers it with a 201. The admin only (401, 403). */
export const POST = defineHandler.withValidator({ body: NewNoteSchema })(async (c, { body }) => {
  const user = requireAdmin(c);
  const note = await addNote(body.text, user.name);
  await notesChanged();
  return c.json(note, 201);
});
