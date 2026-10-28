# Bun fullstack base

A [Void](https://void.cloud) app on [Bun](https://bun.com): file routes for the API and React pages prerendered at
build, on one server and one port, typed end to end. The routes validate their input with Zod, and the web app's client
takes its types from them, so a renamed field fails `bun run check` instead of production.

| Part    | What                                                                                                |
| ------- | --------------------------------------------------------------------------------------------------- |
| Server  | Void (target `bun`): `routes/`, `pages/` and `middleware/` by file, on [Hono](https://hono.dev)     |
| API     | Zod-validated handlers in `routes/api/`, logic in `src/api/<module>/`                               |
| DB      | SQLite inside Bun (`bun:sqlite`), through [Drizzle](https://orm.drizzle.team), in `db/`             |
| Web     | React 19 pages (`pages/`), TanStack Query, Tailwind CSS 4, shadcn/ui, in `src/web/`                 |
| Tooling | [Vite+](https://viteplus.dev) (`vp`): dev, build, format, lint, type-check, tests (web in Chromium) |

## Getting started

Needs **Bun 1.4.3** ([installation](https://bun.com/docs/installation)), the version CI and `packageManager` pin.

```sh
bun install --frozen-lockfile                   # also runs `void prepare`: the routes' types, in .void/
bunx playwright install --with-deps chromium   # once, for the web tests
bun run dev                                     # http://localhost:3000
```

| Script                | What it does                                                                  |
| --------------------- | ----------------------------------------------------------------------------- |
| `bun run dev`         | Serve with hot reload                                                         |
| `bun run build`       | Build the server and the pages into `dist/`                                   |
| `bun run start`       | Serve the build (`dist/ssr/index.js`)                                         |
| `bun run check`       | Format check, lint and type-check (`check:fix` fixes what it can)             |
| `bun run test`        | API and web tests (`test:watch` reruns on change)                             |
| `bun run db:generate` | Write a migration for the changed tables (the server applies it on first use) |
| `bun run backup`      | Copy the database into `.backups/` (`.scripts/backup.ts`)                     |
| `bun run bench`       | Load the built server with oha (`.scripts/bench.ts`)                          |

Every setting has a default (`src/config.ts`); to change one, copy `example.env` to `.env`. The database is
`.data/app.db`, created on first use. CI (`.github/workflows/ci.yml`) runs install, `check`, `test` and `build`.

## Layout

```
routes/api/         the API, one file per path (Void): thin handlers, validated by the module's Zod schemas
pages/              the pages, one per path (Void): layout.tsx, index.tsx; files starting with _ aren't pages
middleware/         every request, in order: 01.errors (JSON errors), 02.security, 03.log, 04.limits,
                    05.pages (the prerendered HTML)
db/                 client.ts (migrated on first use), schema/ (a file per table), migrations/, drizzle.config.ts
src/config.ts       the settings, from the environment, checked with Zod at start
src/api/            a folder per module: <module>.schemas.ts, <module>.service.ts, tests → src/api/README.md
src/web/            components, lib/api.ts (the typed client), mocks (MSW), styles → src/web/README.md
public/             files served at fixed URLs (favicon.svg, robots.txt, llms.txt)
.scripts/           the backup and benchmark scripts
.agents/skills/     the steps for adding API modules, endpoints and API calls
.railway/           the Railway service, as code
void.config.ts      Void's settings: target bun, the pages prerendered (output: static), the page's <head>
vite.config.ts      Vite+: plugins, aliases (@/ for src/, @db/ for db/), format, lint, test projects
```

- **One error shape**: every error is `{ error: string }` (a validation error adds `issues`), which the web app reads
  from Void's `FetchError` (`error.data`).
- **The web app imports no server code**: a lint rule allows only types from `@/api` and `@db` in `src/web/` and
  `pages/`.

## Adding a feature

The steps are [Agent Skills](https://agentskills.io), which people can follow too:
[`api-module`](.agents/skills/api-module/SKILL.md) (a new module),
[`api-endpoint`](.agents/skills/api-endpoint/SKILL.md) (another route) and
[`web-api-call`](.agents/skills/web-api-call/SKILL.md) (calling the API from a page). Then
`bun run check:fix && bun run check && bun run test`.

## Deploying (Railway)

`.railway/railway.ts` is the service: Railway builds it with `bun run build`, runs `bun run start`, keeps the database
on a volume at `/data` (`DATABASE_PATH=/data/app.db`), and checks `/api/health`. The rate limit counts clients by
`X-Real-IP`, which Railway's edge sets on every public request. The service deploys `main`: merge this branch before
`railway config apply`, as the old build on `main` has no `bun run start`.

## Benchmark

`bun run bench` builds, then loads each route of the bare server with [oha](https://github.com/hatoo/oha)
(`cargo install oha`), 3 rounds each on a fresh server and a copy of a database of a million notes, and prints a table.

## Conventions

- Imports use `@/…` for `src/` and `@db/…` for `db/`, with explicit `.ts`/`.tsx` extensions, and `./` within a folder.
- Tests sit next to the code they test, as `<name>.test.ts` (`.test.tsx` for components); in `pages/`, as
  `_<page>.test.tsx`, so Void doesn't serve them.
- Comments go above the code they explain (doc comments), not inside function bodies or at the end of a line.
- Lines wrap at 120 characters; `bun run check:fix` formats and sorts imports.
- Every script that runs a package's binary (`vp`, `drizzle-kit`) says `bun --bun`, so it runs on Bun instead of
  Node.
