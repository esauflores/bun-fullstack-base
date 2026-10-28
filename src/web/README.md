# web

The React app. Void renders it from the root's `pages/` (prerendered to HTML at build, then hydrated), and it calls the
API through Void's typed `fetch`, so the routes in `routes/` are its types. `pages/index.tsx` is the example to copy.

| Piece   | What                                                                            |
| ------- | ------------------------------------------------------------------------------- |
| UI      | React 19, [shadcn/ui](https://ui.shadcn.com) components, Tailwind CSS 4         |
| Routing | Void's pages: one file in `pages/` per path, `pages/layout.tsx` around them all |
| Data    | [TanStack Query](https://tanstack.com/query), over Void's typed `fetch`         |
| Tests   | Vitest browser mode (through Vite+), in headless Chromium, with Testing Library |

## Layout

```
pages/                 Void's pages, one per path (files starting with _ aren't pages: tests, page-only parts)
├── layout.tsx         every page's frame: the stylesheet and the query client (retries 5xx, not 4xx)
├── index.tsx          `/`
└── _index.test.tsx
src/web/
├── assets/            (create it when needed) images the components import: built under a hashed name, kept by
│                      browsers (files linked by a fixed URL, like favicon.svg, go in the root's public/ instead)
├── components.json    shadcn's settings: where its components go, the stylesheet, the aliases
├── components/        the app's own components (ApiStatus, ThemeToggle)
│   └── ui/            shadcn components, once added with bunx shadcn add (yours to edit)
├── lib/
│   ├── api.ts         api(): Void's typed fetch, one attempt (TanStack Query retries)
│   └── utils.ts       cn(): merges Tailwind classes, used by the components
├── mocks/             the API, mocked for the tests (see Tests)
│   └── test.ts        MSW's handlers, one per endpoint the pages call, and `it` for the web tests: starts MSW's
│                      worker once per file, resets its handlers after each test
├── styles/
│   ├── fonts.css      Geist and Geist Mono, Latin only (bundled by Vite with the CSS)
│   └── global.css     Tailwind, shadcn's additions, and the theme (colors, fonts, radius) as CSS variables, light
│                      and dark
└── tsconfig.json      DOM and JSX in place of Bun's types (pages/tsconfig.json extends it)
```

## Calling the API

Through `api` from `lib/api.ts`, never a hand-written `fetch`: `api("/api/hello/:name", { params: { name } })` returns
the typed body, or throws Void's `FetchError`, with the status in `error.response` and the API's `{ error }` body in
`error.data`. A renamed path, param or field is then a type error that `bun run check` catches. The
[`web-api-call`](../../.agents/skills/web-api-call/SKILL.md) skill has the patterns for reading, changing and testing.

## Adding a page

1. `pages/books.tsx`: a component as its default export, reading data with `useQuery`. Void serves it at `/books`.
2. `pages/_books.test.tsx`: render it, assert on the screen (see [Tests](#tests): the API is mocked by MSW).

## Components and theme

`bunx shadcn add card --cwd src/web` puts a component in `components/ui/`, as source to edit: `--cwd` is what finds
`components.json` here, and its aliases (`@/web/…`) resolve from this folder through the `paths` in `tsconfig.json`.
shadcn's registry writes `import { cn } from "cn"` and adds the `cn` package: change the import to
`@/web/lib/utils.ts`, run `bun remove cn`, then `bun run check:fix`.

Use the theme's classes (`bg-background`, `text-destructive`, …), not raw colors. Next to shadcn's, the template adds
`brand` (the lime accent; `brand-text` for text), `subtle`, `edge` (a stronger border), `success`, `success-muted`,
`destructive-muted`, `code` and `code-string`. A new one is a variable in both blocks of `global.css` (light in
`:root`, dark in `.dark`) and a `--color-*` in `@theme`. Icons come from [Lucide](https://lucide.dev). The theme is
the `.dark` class on `<html>`: void.config.ts's head script sets it before the first paint, and `ThemeToggle` switches
it and saves the choice.

## Tests

They run in headless Chromium (`bunx playwright install --with-deps chromium` once), with the API mocked in the browser
by [MSW](https://mswjs.io): `mocks/test.ts` has one handler per endpoint the pages call, and a test takes `it` from it,
which starts MSW's worker (its service worker is served by MSW's Vite plugin) and hands each test the
`worker` to override a route for its own case:

```tsx
import { http, HttpResponse } from "msw";

import { it } from "@/web/mocks/test.ts";

it("shows the API's error", async ({ worker }) => {
  worker.use(http.get("/api/books", () => HttpResponse.json({ error: "Nope" }, { status: 503 })));
  // …
});
```

- **No server, no database, no port.** Requests are answered inside Chromium, so the suite stays hermetic and fast.
- **Error paths the real API never answers** — a 502 with no body, a health check that's down — are one
  `worker.use(…)` away.
- **A missing handler is loud:** anything unmocked answers `500 { error: "No handler for …" }`, which shows on screen.
- The default handlers hold no state: a test that writes and reads back (a list that grows after a POST) overrides
  both routes over a list of its own; the overrides are reset between tests.
