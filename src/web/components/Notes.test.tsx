import { cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, expect } from "vite-plus/test";
import { auth } from "void/client/react";

import { it, liveNotes } from "@/web/mocks/test.ts";

import { Notes } from "./Notes.tsx";

afterEach(cleanup);

it("asks to sign in, and opens no socket, when signed out", async () => {
  render(<Notes />);

  expect(await screen.findByText(/Sign in above/)).toBeTruthy();
  expect(screen.queryByText("Connecting…")).toBeNull();
});

it("shows the notes the live room sends, with their author and time left", async ({ worker }) => {
  const note = { id: 1, text: "Tick at 12:00:00 UTC", createdAt: new Date().toISOString(), author: "Admin" };
  worker.use(
    http.get("/api/auth/get-session", () =>
      HttpResponse.json({
        session: { id: "s" },
        user: { id: "u", name: "Test", email: "test@example.com", role: "user" },
      }),
    ),
    liveNotes.addEventListener("connection", ({ client }) =>
      client.send(JSON.stringify({ type: "notes", notes: [note] })),
    ),
  );
  /** The session is shared by the whole file, cached from the first test: ask it again, now signed in. */
  auth.$store.notify("$sessionSignal");
  render(<Notes />);

  expect(await screen.findByText(note.text)).toBeTruthy();
  expect(screen.getByText("Admin")).toBeTruthy();
  expect(screen.getByText(/^(25:00|24:59)$/)).toBeTruthy();
});
