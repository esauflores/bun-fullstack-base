import { useEffect, useState } from "react";
import { auth } from "void/client/react";
import { connect } from "void/ws";

import type { Note } from "@/api/notes/notes.service.ts";

/** How long a note lives, as the API's NOTE_TTL_MS (src/api/notes/notes.service.ts). */
const NOTE_TTL_MS = 25 * 60_000;

/**
 * The live notes, for any signed-in user: the server sends them over a WebSocket (/api/notes/live) on every
 * change. Only the admin may change notes, and that's the cron, which adds one every 5 minutes; each lives 25.
 */
export function Notes() {
  const signedIn = Boolean(auth.useSession().data);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!signedIn) return setNotes(null);
    const socket = connect("/api/notes/live");
    socket.on("message", (event) => setNotes(event.notes));
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      socket.close();
      clearInterval(clock);
    };
  }, [signedIn]);

  const live = notes?.filter((note) => left(note, now) > 0);

  return (
    <div className="mt-4 overflow-hidden rounded-xl border bg-card">
      <p className="border-b px-5 py-4 text-sm text-muted-foreground">
        {signedIn
          ? "Live: the admin's cron adds a note every 5 minutes, and each lives 25. Only the admin changes notes."
          : "Sign in above to watch the notes arrive live."}
      </p>
      {signedIn && (
        <ul className="divide-y">
          {live?.map((note) => (
            <li key={note.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="flex-[1_1_260px] text-sm wrap-anywhere">{note.text}</span>
              <span className="text-xs text-muted-foreground">{note.author}</span>
              <span className="w-10 text-right font-mono text-xs text-subtle">{remaining(note, now)}</span>
            </li>
          ))}
          {live?.length === 0 && <li className="px-5 py-4 text-sm text-subtle">No notes right now.</li>}
          {!live && <li className="px-5 py-4 text-sm text-subtle">Connecting…</li>}
        </ul>
      )}
    </div>
  );
}

/** A note's time left, in ms, at `now`. */
const left = (note: Note, now: number) => Date.parse(note.createdAt) + NOTE_TTL_MS - now;

/** A note's time left at `now`, as m:ss: 25:00 → 0:01. */
function remaining(note: Note, now: number) {
  const seconds = Math.ceil(left(note, now) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
