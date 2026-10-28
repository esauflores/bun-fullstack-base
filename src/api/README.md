# api

Everything under `/api`, on the pages' origin (no CORS). The HTTP side is Void's file routes in `routes/api/`; the
logic is here, a folder per **module**. `notes/` is the example to copy; `hello/` is the smallest.

| Endpoint                 | What it answers                                                             |
| ------------------------ | --------------------------------------------------------------------------- |
| `GET /api/health`        | `{ ok: true }` after a `SELECT 1`, so a database that can't answer fails it |
| `GET /api/hello/{name}`  | `{ message }`: the example module                                           |
| `GET /api/notes`         | `{ notes, next }`: a page, newest first (`?limit=20&before=<next>`)         |
| `POST /api/notes`        | `{ text }` saves a note and answers it, `201`                               |
| `PATCH /api/notes/{id}`  | `{ text }` changes a note's text and answers it; `404` when there's none    |
| `DELETE /api/notes/{id}` | deletes a note, `204` with no body; `404` when there's none                 |

## Layout

```
routes/api/notes/index.ts    GET, POST /api/notes: thin handlers, validated by the module's schemas
routes/api/notes/[id].ts     PATCH, DELETE /api/notes/{id}
src/api/notes/
├── notes.schemas.ts         the Zod schemas of its input
├── notes.service.ts         the logic: plain functions, no HTTP (its table is db/schema/notes.ts)
└── *.test.ts                the service, and the routes through Void's app
src/api/virtual.d.ts         the type of Void's app (virtual:void-routes): app.request("/api/…") in the tests
```

To add a module or a route, follow the [`api-module`](../../.agents/skills/api-module/SKILL.md) or
[`api-endpoint`](../../.agents/skills/api-endpoint/SKILL.md) skill.

## Rules

- **Routes are thin**: `defineHandler.withValidator({ params, query, body })`, then call the service and return its
  value (JSON, `200`), `c.json(value, 201)` for another status, or `null` for a `204`.
- **Services don't know about HTTP**: plain values in and out, an `HTTPException` (4xx) for a domain failure.
- **Modules talk through services**, never through each other's routes.

## Requests

The middleware (`middleware/`) runs in order: JSON errors, security headers, the request log (`<--` on arrival, `-->`
when answered) and the limits, the last two on `/api` only and not on `/api/health`. Invalid input answers
`400 { error: "Validation failed", issues }`; an `HTTPException` answers `{ error: message }` with its status, so keep
internals out of the message; anything else is a bug, answered `500 { error: "Internal Server Error" }`. Unknown
paths answer `404 { error: "Not Found" }`.

## Database

SQLite inside Bun (`bun:sqlite`), with [Drizzle](https://orm.drizzle.team), in `db/`. Its queries are synchronous, so
the services are plain functions.

- **Settings** (`db/client.ts`): WAL, `synchronous = NORMAL` (a power cut can lose the last commits, never the file)
  and foreign keys, each checked when it opens, and a 5 s `busy_timeout`.
- **Queries that run on most requests are prepared once**, with `sql.placeholder(…)`, as in `notes.service.ts`.
- **Migrations**: after changing a table, `bun run db:generate` writes the SQL into `db/migrations/`; commit it. The
  server applies new ones when it first opens the database (the first request that uses it). Never edit one that has
  run: generate another.
- **The file** is `DATABASE_PATH`, `.data/app.db` by default (`/data/app.db` on Railway). Tests use `:memory:`, a
  fresh database per test file. Run one server per file.

## Rate limits

Each client gets `RATE_LIMIT` requests a minute (300 by default, `0` for none), then `429 { error }` with
`Retry-After`, counted in memory: run one instance, or add a shared store before scaling out. The client is
`X-Real-IP`, which Railway's edge sets on every public request, replacing any the client sent (requests over
`*.railway.internal` skip the edge). Locally there is none, so all clients share one count.
