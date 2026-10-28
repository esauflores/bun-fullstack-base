---
name: web-api-call
description: Call the API from the React web app with Void's typed fetch (api in src/web/lib/api.ts) and TanStack Query, show its errors, and test it with the API mocked by MSW. Use when a page or component needs data from /api or sends data to it.
compatibility: Bun 1.4+. Run commands from the repo root. Web tests need Chromium once (bunx playwright install --with-deps chromium).
---

# Call the API from the web app

The client is typed from the API's routes (`routes/`), so params and bodies need no hand-written types. If an endpoint
doesn't exist yet, add it first (`api-module` or `api-endpoint` skill).

## The client

`api` from `src/web/lib/api.ts` is Void's typed `fetch` (one attempt; TanStack Query retries). The path is the route's
pattern, and its params, query and body are checked against the route's validators:

| Input       | Call                                                     |
| ----------- | -------------------------------------------------------- |
| Path params | `api("/api/books/:id", { params: { id } })` (encoded)    |
| Query       | `api("/api/books", { query: { q } })`                    |
| JSON body   | `api("/api/books", { method: "POST", body: { title } })` |

It returns the typed body (`undefined` for a `204`), or throws Void's `FetchError` on a non-2xx answer:
`error.response.status`, and the API's `{ error }` in `error.data`. Never write `fetch("/api/…")` by hand: it loses the
types.

## Reading data

```tsx
const books = useQuery({ queryKey: ["books", q], queryFn: () => api("/api/books", { query: { q } }) });
```

Put every value the request depends on in `queryKey`. To show the API's message:

```tsx
import { FetchError } from "void/client";

const message = (error: Error) =>
  (error instanceof FetchError && (error.data as { error?: string } | undefined)?.error) || error.message;
```

## Changing data

```tsx
const queryClient = useQueryClient();
const addBook = useMutation({
  mutationFn: (title: string) => api("/api/books", { method: "POST", body: { title } }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
});
```

Invalidate the queries the change affects, so lists refetch.

A new page is a file in `pages/`: `pages/books.tsx`, its component as the default export, is served at `/books`.

## Tests

Next to the code they test: `pages/books.tsx` is tested in `pages/_books.test.tsx` (the `_` keeps Void from serving it
as a page), a component in `src/web/components/` next to it.

The web tests run in headless Chromium with the API mocked in the browser by [MSW](https://mswjs.io):
`src/web/mocks/worker.ts` has one handler per endpoint the pages call, and tests take `it` from `src/web/mocks/test.ts`,
which starts MSW's worker and resets the handlers after each test. A test that needs another answer takes the `worker`
fixture and overrides a route with `worker.use(…)`: no server, database or port. The default handlers hold no state, so
a test that writes and reads it back overrides both routes over a list of its own, answering in the shape the routes do.

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, expect } from "vite-plus/test";

import { it } from "@/web/mocks/test.ts";

import Books from "./books.tsx";

afterEach(cleanup);

it("adds a book", async ({ worker }) => {
  const books: { id: number; title: string }[] = [];
  worker.use(
    http.get("/api/books", () => HttpResponse.json({ items: books })),
    http.post("/api/books", async ({ request }) => {
      const book = { id: books.length + 1, ...((await request.json()) as { title: string }) };
      books.push(book);
      return HttpResponse.json(book, { status: 201 });
    }),
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Books />
    </QueryClientProvider>,
  );

  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Emma" } });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));

  expect(await screen.findByText("Emma")).toBeTruthy();
});
```

Add the route's handler to `mocks/worker.ts` (that's what a new endpoint costs), and cover the error path with an
override: a handler answering `HttpResponse.json({ error: "…" }, { status: 400 })` puts that message on the screen.
Anything with no handler at all answers `500 { error: "No handler for …" }`, so a forgotten mock shows up instead of
passing.

## Verify

```sh
bun run check:fix && bun run check
bun run test
```
