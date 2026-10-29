# api

Everything under `/api`, on the pages' origin (no CORS), in one Cloudflare Worker. The HTTP side is Void's file routes
in `routes/api/`; the logic is here, a folder per **module**. `notes/` is the example to copy; `hello/` is the
smallest.

| Endpoint                      | What it answers                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET /api/health`             | `{ ok: true }` after a `SELECT 1` on D1, so a database that can't answer fails it                       |
| `GET /api/hello/{name}`       | `{ message }`: the example module                                                                       |
| `GET /api/notes`              | `{ notes, next }`: a page of live notes, newest first (`?limit=20&before=`); signed in, `401` otherwise |
| `POST /api/notes`             | `{ text }` saves a note and answers it, `201`; `401` signed out, `403` not admin                        |
| `PATCH /api/notes/{id}`       | `{ text }` changes a note's text and answers it; `404`, `401`, `403` as above                           |
| `DELETE /api/notes/{id}`      | deletes a note, `204` with no body; `404`, `401`, `403` as above                                        |
| `WS /api/notes/live`          | a WebSocket: `{ type: "notes", notes }` on connect and every change; signed in only                     |
| `GET /api/daily`              | `{ card }`: the newest daily card by Workers AI (`{ date, text }`), null before one                     |
| `GET /api/daily/{date}/image` | the card's image (JPEG, from R2), cached a day; `404` without one, `400` bad date                       |
| `/api/auth/*`                 | Better Auth (Void's): `POST sign-in/email`, `POST sign-out`, `GET get-session`, …                       |

## Layout

```
routes/api/notes/index.ts    GET, POST /api/notes: thin handlers, validated by the module's schemas
routes/api/notes/[id].ts     PATCH, DELETE /api/notes/{id}
routes/api/notes/live.ws.ts  WS /api/notes/live: one room (a Durable Object) every viewer shares
src/api/notes/
├── notes.schemas.ts         the Zod schemas of its input
├── notes.service.ts         the logic: plain async functions, no HTTP (its table is db/schema/notes.ts); notesChanged()
                             tells the live room to send the notes again
└── *.test.ts                the routes, over HTTP
src/api/auth/accounts.ts     the two accounts (ensureAccounts()), requireAdmin()
src/api/test-server.ts       the tests' server: Void's dev server, the Worker in Miniflare, a fresh D1
src/api/test-client.ts       request(), signIn() and runCron(), for the tests
src/api/daily/daily.service.ts  the daily card: writeCard() (Workers AI's haiku and image; the image in R2),
                             latestCard(), cardImage(); AI_FAKE answers fixed ones
routes/api/daily/            GET /api/daily (the newest card), GET /api/daily/{date}/image
crons/notes.ts               every 5 minutes: a note as the admin, the expired ones deleted
crons/daily.ts               daily at 06:00 UTC: the day, to the daily queue
queues/daily.ts              each day: its card; retried 10 minutes later if it throws, or when the AI's limit resets
```

To add a module or a route, follow the [`api-module`](../../.agents/skills/api-module/SKILL.md) or
[`api-endpoint`](../../.agents/skills/api-endpoint/SKILL.md) skill.

## Rules

- **Routes are thin**: `defineHandler.withValidator({ params, query, body })`, then call the service and return its
  value (JSON, `200`), `c.json(value, 201)` for another status, or `null` for a `204`.
- **Services don't know about HTTP**: plain values in and out, an `HTTPException` (4xx) for a domain failure.
- **Modules talk through services**, never through each other's routes.
- **Routes check who's asking first**: `requireAuth(c)` (`void/auth`), a `401` without a session, or `requireAdmin(c)`
  (`auth/accounts.ts`), also a `403` for anyone but the admin. The accounts, made on a Worker instance's first
  request (`middleware/00.accounts.ts`), sign-up off: `admin@example.com` (role `admin`, password `ADMIN_PASSWORD`,
  random when unset) and `test@example.com` /
  `test1234` (role `user`). `/api/auth/*` is Better Auth's, and answers its errors as `{ message, code }`.
- **Notes live 25 minutes** (`NOTE_TTL_MS`): the list leaves out older ones, and the cron's next run deletes them. Each change calls
  `notesChanged()`, so the room sends the notes to every viewer.

## Requests

The middleware (`middleware/`) runs in order: the accounts, JSON errors, security headers (not on a WebSocket's
upgrade), the request log (`<--` on arrival, `-->` when answered) and the body limit, the last two on `/api` only and
not on `/api/health`. Invalid input answers `400 { error: "Validation failed", issues }`; an `HTTPException` answers
`{ error: message }` with its status, so keep internals out of the message; anything else is a bug, answered
`500 { error: "Internal Server Error" }`. Unknown paths answer `404 { error: "Not Found" }`.

## Database

Cloudflare D1 (SQLite), with [Drizzle](https://orm.drizzle.team) through `db` from `void/db`, which picks the
request's database. Its queries are async. A Durable Object, which has no request, uses `createDb(ctx.env.DB)`.

- **Tables**: one file each in `db/schema/`, re-exported by `db/schema/index.ts`. Better Auth's are Void's, generated
  from `auth.ts` (`.void/better-auth-schema.ts`).
- **Migrations**: after changing a table or `auth.ts`, `bun run db:generate` writes the SQL into `db/migrations/`;
  commit it. Dev applies new ones at start, `bun run deploy` before it uploads. Never edit one that has run: generate
  another. The local database is in `.void/`; `void db reset` remakes it from the migrations.
- **Tests** run on a fresh local D1 each time.

## Limits

The body limit is `MAX_BODY_BYTES` (1 MB), `413 { error }` over it.
