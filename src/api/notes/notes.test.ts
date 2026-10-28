import app from "virtual:void-routes";
import { describe, expect, it } from "vite-plus/test";

import { addNote } from "./notes.service.ts";

/** A POST /api/notes with a JSON body. */
const post = (body: unknown) =>
  app.request("/api/notes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("GET /api/notes", () => {
  it("answers a page and the cursor for the next", async () => {
    for (let i = 0; i < 3; i++) addNote(`Note ${i}`);
    const response = await app.request("/api/notes?limit=2");
    const page = (await response.json()) as { notes: { id: number }[]; next: number | null };

    expect(response.status).toBe(200);
    expect(page.notes).toHaveLength(2);
    expect(page.next).toBe(page.notes[1]!.id);
  });

  it("rejects a limit over 100 with a 400", async () => {
    const response = await app.request("/api/notes?limit=101");

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({ error: "Validation failed", issues: [{ slot: "query" }] });
    expect(JSON.stringify(body)).toContain("<=100");
  });
});

describe("PATCH /api/notes/{id}", () => {
  const patch = (id: number | string, body: unknown) =>
    app.request(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  it("changes the text and answers the note, keeping its id and time", async () => {
    const note = addNote("Draft");
    const response = await patch(note.id, { text: " Final " });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...note, text: "Final" });
  });

  it("answers 404 for a note that doesn't exist", async () => {
    const response = await patch(999_999, { text: "Final" });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "No such note" });
  });

  it("rejects an id that isn't a positive number, and an empty text, with a 400", async () => {
    const note = addNote("Draft");

    expect((await patch("abc", { text: "Final" })).status).toBe(400);
    expect((await patch(note.id, { text: "" })).status).toBe(400);
  });
});

describe("POST /api/notes", () => {
  it("answers the saved note with a 201, trimmed, and GET lists it first", async () => {
    const response = await post({ text: "  Buy milk " });
    const note = (await response.json()) as { id: number; text: string };

    expect(response.status).toBe(201);
    expect(note.text).toBe("Buy milk");
    expect(await (await app.request("/api/notes?limit=1")).json()).toMatchObject({ notes: [note] });
  });

  it("rejects an empty text with a 400", async () => {
    const response = await post({ text: " " });

    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).toContain(">=1 characters");
  });
});

describe("DELETE /api/notes/{id}", () => {
  const remove = (id: number | string) => app.request(`/api/notes/${id}`, { method: "DELETE" });

  it("answers 204 with no body, and the note is gone", async () => {
    const note = addNote("Done");
    const response = await remove(note.id);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect((await remove(note.id)).status).toBe(404);
  });

  it("answers 404 for a note that doesn't exist, and 400 for an id that isn't a positive number", async () => {
    const response = await remove(999_999);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "No such note" });
    expect((await remove("abc")).status).toBe(400);
  });
});
