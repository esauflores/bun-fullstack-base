import { http, HttpResponse, ws } from "msw";
import { setupWorker } from "msw/browser";
import { it as base } from "vite-plus/test";

/**
 * The page's API, answered in the browser by MSW (never the real server): one handler per endpoint the pages call,
 * the way the routes answer it, so a test doesn't need a server, a database or a port.
 */
/** The live room, WS /api/notes/live, on any host. */
export const liveNotes = ws.link(/\/api\/notes\/live$/);

const handlers = [
  http.get("/api/health", () => HttpResponse.json({ ok: true })),
  /** Signed out: Better Auth answers null for a request without a session. */
  http.get("/api/auth/get-session", () => HttpResponse.json(null)),
  /** The live room: connects, and sends nothing. A test sends notes with `liveNotes.addEventListener("connection", …)`. */
  liveNotes.addEventListener("connection", () => {}),
  /** No daily card yet, as before the first 06:00 UTC. */
  http.get("/api/daily", () => HttpResponse.json({ card: null })),
  http.get("/api/hello/:name", ({ params }) => HttpResponse.json({ message: `Hello, ${String(params.name)}!` })),
  /** Anything else answers a 500 { error }, so a missing handler shows on the screen instead of passing silently. */
  http.all("*", ({ request }) => {
    const { pathname } = new URL(request.url);
    return HttpResponse.json({ error: `No handler for ${request.method} ${pathname}` }, { status: 500 });
  }),
];

/** MSW's worker: it runs in the service worker vite.config.ts serves at /mockServiceWorker.js. */
const worker = setupWorker(...handlers);

/**
 * `it`, with the page's API answered by the handlers above: tests are hermetic and fast, and can answer what the real
 * API never would: a 502, an offline health check. A test overrides one route for its case with
 * `({ worker }) => worker.use(http.get(…))`, reset after it. The fixture takes `{}`: Vitest reads a fixture's
 * dependencies from its first parameter, which must be a destructuring pattern.
 */
export const it = base.extend<{ worker: typeof worker }>({
  worker: [
    // oxlint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await use(worker);
      worker.resetHandlers();
    },
    { auto: true },
  ],
});

/** Once per test file: MSW's worker registers its service worker, which stays across the file's tests. */
await worker.start({ quiet: true });
