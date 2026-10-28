import { defineHandler } from "void";

import { NewNoteSchema, NoteIdSchema } from "@/api/notes/notes.schemas.ts";
import { deleteNote, updateNote } from "@/api/notes/notes.service.ts";

/** PATCH /api/notes/{id}: changes a note's text, 404 when there's no such note. */
export const PATCH = defineHandler.withValidator({ params: NoteIdSchema, body: NewNoteSchema })(
  (_c, { params, body }) => updateNote(params.id, body.text),
);

/** DELETE /api/notes/{id}: removes a note, answering 204 with no body; 404 when there's no such note. */
export const DELETE = defineHandler.withValidator({ params: NoteIdSchema })((_c, { params }) => {
  deleteNote(params.id);
  return null;
});
