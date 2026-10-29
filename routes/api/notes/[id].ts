import { defineHandler } from "void";

import { requireAdmin } from "@/api/auth/accounts.ts";
import { NewNoteSchema, NoteIdSchema } from "@/api/notes/notes.schemas.ts";
import { deleteNote, notesChanged, updateNote } from "@/api/notes/notes.service.ts";

/** PATCH /api/notes/{id}: changes a note's text, 404 when there's no such note. The admin only (401, 403). */
export const PATCH = defineHandler.withValidator({ params: NoteIdSchema, body: NewNoteSchema })(async (
  c,
  { params, body },
) => {
  requireAdmin(c);
  const note = await updateNote(params.id, body.text);
  await notesChanged();
  return note;
});

/** DELETE /api/notes/{id}: removes a note, answering 204 with no body; 404 when there's none. The admin only. */
export const DELETE = defineHandler.withValidator({ params: NoteIdSchema })(async (c, { params }) => {
  requireAdmin(c);
  await deleteNote(params.id);
  await notesChanged();
  return null;
});
