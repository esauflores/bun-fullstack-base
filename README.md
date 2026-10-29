# Fullstack base

A [Void](https://void.cloud) app on [Cloudflare](https://workers.cloudflare.com): file routes for the API and React
pages rendered at the edge, in one Worker, typed end to end. The routes validate their input with Zod, and the web
app's client takes its types from them, so a renamed field fails `bun run check` instead of production. Live at
[fullstack-demo.esauflores.com](https://fullstack-demo.esauflores.com).

| Part    | What                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------- |
| Server  | Void on a Cloudflare Worker: `routes/`, `pages/`, `middleware/`, `crons/`, `queues/` by file, on [Hono](https://hono.dev) |
| API     | Zod-validated handlers in `routes/api/`, logic in `src/api/<module>/`                                                     |
| DB      | Cloudflare D1 (SQLite), through [Drizzle](https://orm.drizzle.team) (`void/db`), tables in `db/`                          |
| Auth    | [Better Auth](https://www.better-auth.com), as Void sets it up (`auth.ts`): roles admin and user                          |
| Live    | A WebSocket room (`void/ws`, a Durable Object), Cron Triggers (`crons/`) and a Queue (`queues/`)                          |
| AI      | A daily haiku and its image by Workers AI (`void/ai`), the image in R2 (`void/storage`)                                   |
| Web     | React 19 pages (`pages/`), TanStack Query, Tailwind CSS 4, shadcn/ui, in `src/web/`                                       |
| Tooling | [Vite+](https://viteplus.dev) (`vp`): dev, build, format, lint, type-check, tests (web in Chromium)                       |

## Getting started

Needs **Bun 1.4.3** ([installation](https://bun.com/docs/installation)) to install and run the scripts, and
**Node 24+**, which runs Vite+ and Cloudflare's local runtime (Miniflare).

```sh
bun install --frozen-lockfile                   # also runs `void prepare`: the routes', env's and DB's types, in .void/
bunx playwright install --with-deps chromium   # once, for the web tests
bun run dev                                     # http://localhost:3000, the Worker in Miniflare, a local D1
```

| Script                | What it does                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `bun run dev`         | Serve with hot reload; the local D1 applies `db/migrations/` at start                          |
| `bun run build`       | Build the Worker and the pages into `dist/`                                                    |
| `bun run deploy`      | Build and deploy to Cloudflare (`void deploy`), migrating D1 first                             |
| `bun run check`       | Format check, lint and type-check (`check:fix` fixes what it can)                              |
| `bun run test`        | API tests (against a dev server) and web tests (`test:watch` reruns on change)                 |
| `bun run db:generate` | Write a migration for the changed tables, Better Auth's included (`void db generate`)          |
| `bun run db:seed`     | Reset the local D1 and add five notes (`db/seed.ts`); restart `dev` so it remakes the accounts |

Settings are declared in `env.ts` (read with `env` from `void/env`); locally, copy `example.env` to `.env`. Neither
Void nor Cloudflare's local runtime fires a cron in dev, so `plugins/dev-crons.ts` (a Vite plugin) does: each schedule in
`crons/` once the Worker answers, then on its own times (UTC); restart `dev` after adding or rescheduling one. CI (`.github/workflows/ci.yml`) runs install,
`check`, `test` and `build`.

## Layout

```
routes/api/         the API, one file per path (Void): thin handlers, validated by the module's Zod schemas;
                    notes/live.ws.ts is the live notes' WebSocket room
pages/              the pages, one per path (Void): layout.tsx, index.tsx; files starting with _ aren't pages
middleware/         every request, in order: 00.accounts (makes the accounts), 01.errors (JSON errors),
                    02.security, 03.api (the request log and the body limit, on /api)
crons/              notes.ts: every 5 minutes, a note, and the expired ones deleted; daily.ts: daily, queues the day
queues/             daily.ts: makes the day's card with Workers AI (retried if the AI fails or hits its limit)
db/                 schema/ (the app's tables, notes and daily; Better Auth's are Void's), migrations/ (both, from `void db generate`),
                    seed.ts (local notes)
src/api/            a folder per module: <module>.schemas.ts, <module>.service.ts, tests; auth/ → src/api/README.md
src/web/            components, lib/api.ts (the typed client), mocks (MSW), styles → src/web/README.md
public/             files served at fixed URLs (favicon.svg, robots.txt, llms.txt)
.agents/skills/     the steps for adding API modules, endpoints and API calls
auth.ts             Better Auth's settings (defineAuth): sign-up off, a role on each user
env.ts              the settings (defineEnv), checked when the Worker starts
void.config.ts      Void's settings: the Worker's name, the ISR cache, the page's <head>
vite.config.ts      Vite+: plugins, aliases (@/ for src/; @schema/, Void's, for db/schema/), format, lint, test projects
plugins/            Vite plugins: dev-crons.ts fires crons/ on their schedules in dev
```

- **One error shape**: every error is `{ error: string }` (a validation error adds `issues`), which the web app reads
  from Void's `FetchError` (`error.data`).
- **Notes live 25 minutes, and arrive live**: the cron adds one every 5 minutes as the admin, the only role that may change
  notes (its password is `ADMIN_PASSWORD`, random when unset). Signed in as the viewer, `test@example.com` / `test1234`, the page's "Account and notes" section
  shows them over a WebSocket, counting down. Sign-up is off.
- **A daily card by Workers AI**: at 06:00 UTC, `crons/daily.ts` queues the day, and `queues/daily.ts` asks Workers AI
  for a haiku and an image of it (about 0.7% of the free plan's daily AI allowance), storing the image in R2. Workers AI
  has no local simulator: in dev it uses your Cloudflare account (`void cloudflare login`), unless `AI_FAKE=true` in
  `.env`, which `example.env` sets and the tests use.
- **The web app imports no server code**: a lint rule allows only types from `@/api` and `@schema/` in `src/web/` and
  `pages/`.

## Adding a feature

The steps are [Agent Skills](https://agentskills.io), which people can follow too:
[`api-module`](.agents/skills/api-module/SKILL.md) (a new module),
[`api-endpoint`](.agents/skills/api-endpoint/SKILL.md) (another route) and
[`web-api-call`](.agents/skills/web-api-call/SKILL.md) (calling the API from a page). Then
`bun run check:fix && bun run check && bun run test`.

## Deploying (Cloudflare)

`bun run deploy` (`void deploy`) signs in to Cloudflare the first time, creates what the app uses (the Worker
`fullstack-demo`, its D1 database, the room's Durable Object, the crons' triggers, the queue `fullstack-demo-daily`, the R2
bucket, the ISR cache; Workers AI needs nothing), applies new migrations, uploads the Worker and checks it before sending it traffic, then prerenders `/`
(`routing.prerender` in `void.config.ts`) into the cache. It records the resources' IDs in `void.lock.json`: commit it. Better
Auth's `BETTER_AUTH_SECRET` is created on the first deploy; other secrets go in with `void secret put <NAME>`. The
domain is attached with `void domain add fullstack-demo.esauflores.com`. `void project status` and `void project
rollback` inspect and undo deploys.

## Conventions

- Imports use `@/…` for `src/` and `@schema/…` for a table's file in `db/schema/` (`@schema/notes.ts`), with explicit `.ts`/`.tsx` extensions, and `./` within a folder.
- Tests sit next to the code they test, as `<name>.test.ts` (`.test.tsx` for components); in `pages/`, as
  `_<page>.test.tsx`, so Void doesn't serve them.
- Comments go above the code they explain (doc comments), not inside function bodies or at the end of a line.
- Lines wrap at 120 characters; `bun run check:fix` formats and sorts imports.
- The scripts run `vp` and `void` on Node, as Cloudflare's local runtime doesn't run on Bun.
