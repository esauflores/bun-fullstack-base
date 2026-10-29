import { createDb } from "void/db";
import { createSelectSchema } from "void/drizzle-zod";
import { defineRoom } from "void/ws";
import { z } from "zod";

import { listNotes, ROOM_HOST } from "@/api/notes/notes.service.ts";
import { notes } from "@schema/notes.ts";

/** A note as the table has it, so the message can't drift from it. */
const Note = createSelectSchema(notes);

/**
 * WS /api/notes/live: one room every viewer shares. A signed-in user gets the live notes on connect and again after
 * every change. A change is an HTTP request to the room (onRequest), which the cron and the API's writes make through
 * notesChanged(), on ROOM_HOST: any other request, a public one, answers 404, so nobody else can make it re-read and
 * broadcast. It reads the notes again rather than trusting a body.
 */
export default defineRoom({
  name: "notes-live",
  messages: {
    client: z.object({ type: z.literal("ping") }),
    server: z.object({ type: z.literal("notes"), notes: z.array(Note) }),
  },
  onBeforeConnect(ctx) {
    if (!ctx.user) return new Response("Sign in to watch the notes", { status: 401 });
  },
  async onConnect(ctx) {
    await ctx.connection.send({ type: "notes", notes: (await listNotes({ limit: 20 }, createDb(ctx.env.DB))).notes });
  },
  async onRequest(ctx) {
    if (new URL(ctx.request.url).host !== ROOM_HOST) return new Response("Not Found", { status: 404 });
    await ctx.room.broadcast({ type: "notes", notes: (await listNotes({ limit: 20 }, createDb(ctx.env.DB))).notes });
    return new Response(null, { status: 204 });
  },
});
