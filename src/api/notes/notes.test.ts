import { readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, inject, it } from "vite-plus/test";

import { origin, request, runCron, signIn } from "@/api/test-client.ts";
import { TEST_USER } from "@/shared/demo.ts";

const adminCookie = await signIn("admin@example.com", "admin-test");
const userCookie = await signIn(TEST_USER.email, TEST_USER.password);

/** A JSON request as the admin, unless another cookie is given. */
const send = (method: string, path: string, body?: unknown, cookie = adminCookie) =>
  request(path, { method, body, cookie });

const post = (body: unknown) => send("POST", "/api/notes", body);

/** Adds a note as the admin, and answers it as saved. */
const note = async (text: string) => (await (await post({ text })).json()) as { id: number; text: string };

describe("permissions", () => {
  it("answers 401 to a change without a session, and 403 to one by a user who isn't the admin", async () => {
    const signedOut = await send("POST", "/api/notes", { text: "Hi" }, "");
    const user = await send("POST", "/api/notes", { text: "Hi" }, userCookie);

    expect(signedOut.status).toBe(401);
    expect(user.status).toBe(403);
    expect(await user.json()).toEqual({ error: "Only the admin changes notes" });
  });

  it("answers 413 to a body over MAX_BODY_BYTES (1 MB), before reading it", async () => {
    const response = await post({ text: "x".repeat(1_100_000) });

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "The request body is over 1048576 bytes" });
  });

  it("keeps sign-up off", async () => {
    const response = await request("/api/auth/sign-up/email", {
      method: "POST",
      body: { email: "someone@example.com", password: "12345678", name: "Someone" },
    });

    expect(response.status).toBe(400);
  });
});

describe("WS /api/notes/live", () => {
  /**
   * Opens the live room with a cookie (Node's WebSocket takes headers). `next()` answers its next message, or
   * "rejected" when the room refuses it.
   */
  const open = (cookie: string) => {
    const socket = new WebSocket(`${origin.replace("http", "ws")}/api/notes/live`, {
      headers: { cookie, origin },
    } as never);
    const queued: unknown[] = [];
    const waiting: ((message: unknown) => void)[] = [];
    const deliver = (message: unknown) => (waiting.length ? waiting.shift()!(message) : queued.push(message));
    socket.addEventListener("message", (event) => deliver(JSON.parse(String(event.data))));
    socket.addEventListener("error", () => deliver("rejected"));
    const next = () =>
      new Promise<unknown>((resolve) => (queued.length ? resolve(queued.shift()) : waiting.push(resolve)));
    return { next, close: () => socket.close() };
  };

  /** The ids in a room's message. */
  const ids = (message: unknown) => (message as { notes: { id: number }[] }).notes.map((n) => n.id);

  it("answers 404 to a public request for a change, which only the Worker's own call makes", async () => {
    expect((await request("/api/notes/live", { method: "POST" })).status).toBe(404);
  });

  it("rejects a viewer who isn't signed in", async () => {
    const room = open("");

    expect(await room.next()).toBe("rejected");
  });

  it("sends a signed-in user the live notes on connect", async () => {
    const { id } = await note("Streamed");
    const room = open(userCookie);

    expect(await room.next()).toMatchObject({
      type: "notes",
      notes: expect.arrayContaining([expect.objectContaining({ id, author: "Admin" })]),
    });
    room.close();
  });

  it("sends the notes again after every change, to everyone connected", async () => {
    const room = open(userCookie);
    await room.next();

    const { id } = await note("Pushed");
    expect(ids(await room.next())).toContain(id);

    await send("PATCH", `/api/notes/${id}`, { text: "Pushed, edited" });
    expect(await room.next()).toMatchObject({
      notes: expect.arrayContaining([expect.objectContaining({ id, text: "Pushed, edited" })]),
    });

    await send("DELETE", `/api/notes/${id}`);
    expect(ids(await room.next())).not.toContain(id);
    room.close();
  });
});

describe("expiry", () => {
  /**
   * The test server's local D1, opened beside the Worker: the API can't backdate a note, so the test writes one 26
   * minutes old itself.
   */
  const d1 = () => {
    const folder = join(inject("state"), "v3/d1/miniflare-D1DatabaseObject");
    return new DatabaseSync(
      join(
        folder,
        readdirSync(folder).find((f) => f !== "metadata.sqlite")!,
      ),
    );
  };

  it("hides a note past its 25 minutes, and the cron deletes it", async () => {
    await note("Wakes the database");
    const database = d1();
    const old = new Date(Date.now() - 26 * 60_000).toISOString();
    const { id } = database
      .prepare("INSERT INTO notes (text, createdAt, author) VALUES ('Old', ?, 'Admin') RETURNING id")
      .get(old) as { id: number };
    const live = async () =>
      (
        (await (await request("/api/notes?limit=100", { cookie: userCookie })).json()) as { notes: { id: number }[] }
      ).notes.map((n) => n.id);

    expect(await live()).not.toContain(id);

    expect((await runCron("*/5 * * * *")).ok).toBe(true);
    expect(database.prepare("SELECT id FROM notes WHERE id = ?").get(id)).toBeUndefined();
    database.close();
  });
});

describe("GET /api/notes", () => {
  it("answers 401 without a session", async () => {
    expect((await request("/api/notes")).status).toBe(401);
  });

  it("pages through every note once, newest first, and ends with no next", async () => {
    const added: number[] = [];
    for (let i = 0; i < 5; i++) added.push((await note(`Note ${i}`)).id);
    const seen: number[] = [];
    let next: number | null = null;
    do {
      const response = await request(`/api/notes?limit=2${next === null ? "" : `&before=${next}`}`, {
        cookie: userCookie,
      });
      expect(response.status).toBe(200);
      const page = (await response.json()) as { notes: { id: number }[]; next: number | null };
      seen.push(...page.notes.map((n) => n.id));
      next = page.next;
    } while (next !== null);

    expect(seen.filter((id) => added.includes(id))).toEqual([...added].reverse());
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("rejects a limit over 100 with a 400", async () => {
    const response = await request("/api/notes?limit=101", { cookie: userCookie });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({ error: "Validation failed", issues: [{ slot: "query" }] });
    expect(JSON.stringify(body)).toContain("<=100");
  });
});

describe("PATCH /api/notes/{id}", () => {
  it("changes the text and answers the note, keeping its id and time", async () => {
    const draft = await note("Draft");
    const response = await send("PATCH", `/api/notes/${draft.id}`, { text: " Final " });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...draft, text: "Final" });
  });
});

describe("POST /api/notes", () => {
  it("answers the saved note with a 201, trimmed, and GET lists it first", async () => {
    const response = await post({ text: "  Buy milk " });
    const added = (await response.json()) as { id: number; text: string };

    expect(response.status).toBe(201);
    expect(added.text).toBe("Buy milk");
    expect(await (await request("/api/notes?limit=1", { cookie: userCookie })).json()).toMatchObject({
      notes: [{ id: added.id, text: "Buy milk", author: "Admin" }],
    });
  });

  it("rejects an empty text with a 400", async () => {
    const response = await post({ text: " " });

    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).toContain(">=1 characters");
  });
});

describe("DELETE /api/notes/{id}", () => {
  const remove = (id: number | string) => send("DELETE", `/api/notes/${id}`);

  it("answers 204 with no body, and the note is gone", async () => {
    const done = await note("Done");
    const response = await remove(done.id);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect((await remove(done.id)).status).toBe(404);
  });

  it("answers 404 for a note that doesn't exist", async () => {
    const response = await remove(999_999);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "No such note" });
  });
});
