import { defineHandler } from "void";

import { NewNoteSchema, NotesQuerySchema } from "@/api/notes/notes.schemas.ts";
import { addNote, listNotes } from "@/api/notes/notes.service.ts";

/** GET /api/notes: a page of notes, newest first, `?limit=` (20 by default) and `?before=` a page's `next`. */
export const GET = defineHandler.withValidator({ query: NotesQuerySchema })((_c, { query }) => listNotes(query));

/** POST /api/notes: adds a note, its text trimmed, and answers it with a 201. */
export const POST = defineHandler.withValidator({ body: NewNoteSchema })((c, { body }) =>
  c.json(addNote(body.text), 201),
);
