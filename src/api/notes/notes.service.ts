import { env } from "cloudflare:workers";
import { HTTPException } from "hono/http-exception";
import { and, db, desc, eq, gte, lt } from "void/db";

import { NOTE_TTL_MS } from "@/shared/demo.ts";
import { notes } from "@schema/notes.ts";

/** A note, as the API answers it. */
export type Note = typeof notes.$inferSelect;

/** The oldest createdAt still alive: createdAt is an ISO string, so the strings compare in time order. */
const cutoff = () => new Date(Date.now() - NOTE_TTL_MS).toISOString();

/**
 * Up to `limit` live notes older than `before` (a note's id), newest first. `next` is the `before` for the next
 * page, or null on the last. `database` is the request's, or a Durable Object's (createDb), which has no request.
 */
export async function listNotes({ limit, before }: { limit: number; before?: number }, database = db) {
  const rows = await database
    .select()
    .from(notes)
    .where(and(lt(notes.id, before ?? Number.MAX_SAFE_INTEGER), gte(notes.createdAt, cutoff())))
    .orderBy(desc(notes.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  return { notes: page, next: rows.length > limit ? page.at(-1)!.id : null };
}

/** Adds a note by `author`, timestamped now, and returns it as saved. */
export async function addNote(text: string, author: string) {
  const [note] = await db.insert(notes).values({ text, author, createdAt: new Date().toISOString() }).returning();
  return note!;
}

/** Changes a note's text and returns it as saved; a 404 HTTPException when there's no such note. */
export async function updateNote(id: number, text: string) {
  const [note] = await db.update(notes).set({ text }).where(eq(notes.id, id)).returning();
  if (!note) throw new HTTPException(404, { message: "No such note" });
  return note;
}

/** Deletes a note; a 404 HTTPException when there's no such note. */
export async function deleteNote(id: number) {
  const [note] = await db.delete(notes).where(eq(notes.id, id)).returning({ id: notes.id });
  if (!note) throw new HTTPException(404, { message: "No such note" });
}

/** Deletes the notes past their 25 minutes, and answers how many there were. */
export async function deleteExpiredNotes() {
  return (await db.delete(notes).where(lt(notes.createdAt, cutoff())).returning({ id: notes.id })).length;
}

/**
 * The host notesChanged() calls the room on: a name only the Worker's own call to the Durable Object has, as Cloudflare
 * routes a public request by its real hostname. The room answers a change from this host only.
 */
export const ROOM_HOST = "room";

/**
 * Tells the live room (routes/api/notes/live.ws.ts) the notes changed, so it sends them to every viewer: a request to
 * its Durable Object, whose binding Void names after the route (NotesLiveWs), untyped in its generated env. Best-effort:
 * the note is saved before this runs, so a failure is logged and never thrown, or the save would answer a 500.
 */
export async function notesChanged() {
  try {
    const { NotesLiveWs: rooms } = env as unknown as { NotesLiveWs: DurableObjectNamespace };
    await rooms.get(rooms.idFromName("default")).fetch(`https://${ROOM_HOST}/api/notes/live`, { method: "POST" });
  } catch (error) {
    console.error("Live update failed, the note is saved:", error);
  }
}
