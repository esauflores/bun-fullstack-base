import { defineScheduled } from "void";

import { addNote, deleteExpiredNotes, notesChanged } from "@/api/notes/notes.service.ts";

/** Every 5 minutes, by Cloudflare's Cron Trigger (in dev, by plugins/dev-crons.ts). */
export const cron = "*/5 * * * *";

/**
 * Deletes the notes past their 25 minutes, adds one as the admin, then tells the live room. So about five notes are
 * alive at any time, for under 1% of the free plan's daily requests and D1 writes.
 */
export default defineScheduled(async () => {
  await deleteExpiredNotes();
  await addNote(`Tick at ${new Date().toISOString().slice(11, 16)} UTC`, "Admin");
  await notesChanged();
});
