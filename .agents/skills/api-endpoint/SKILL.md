---
name: api-endpoint
description: Add an endpoint to an existing API module (a Void file route in routes/api/ calling src/api/<module>/), with a JSON body, query string or path params validated by Zod, and tests. Use when an existing module needs another route, e.g. "add POST /api/books" or "let /api/books filter by title".
compatibility: Bun 1.4+ and Node 24+. Run commands from the repo root.
---

# Add an endpoint to an API module

For a new module, use the `api-module` skill instead; the rules are in `src/api/README.md`.

## Steps

1. **Schemas** in `src/api/<module>/<module>.schemas.ts`, exported, with a doc comment. Put the limits in the schema
   (`.min`, `.max`, `.email()`, …), not in the handler. Query and path values arrive as strings: use
   `z.coerce.number()` for numbers.

   ```ts
   /** The query that filters the list: `q`, part of a title. */
   export const BookListQuerySchema = z.object({ q: z.string().optional() });
   ```

2. **Service** function in `<module>.service.ts`, with a doc comment: plain values in and out, an `HTTPException`
   (4xx) for a domain failure.

3. **Route**: a named export per method in the path's file under `routes/api/` (`[id]` is a param), validated with
   `defineHandler.withValidator({ params, query, body })`. Return the value for a `200`, `c.json(value, 201)` for
   another status, `null` for a `204`.

   ```ts
   // routes/api/books/index.ts
   import { defineHandler } from "void";

   import { BookListQuerySchema, NewBookSchema } from "@/api/books/books.schemas.ts";
   import { addBook, listBooks } from "@/api/books/books.service.ts";

   /** GET /api/books: the books, `?q=` filtering by title. */
   export const GET = defineHandler.withValidator({ query: BookListQuerySchema })((_c, { query }) => listBooks(query));

   /** POST /api/books: adds a book, answering it with a 201. */
   export const POST = defineHandler.withValidator({ body: NewBookSchema })((c, { body }) =>
     c.json(addBook(body.title), 201),
   );
   ```

4. **Tests**: the route in `<module>.test.ts`, over HTTP against the tests' dev server (`src/api/test-server.ts`):
   the success, each error, and a 400. A route that changes data needs a session: `signIn(email, password)`.

   ```ts
   import { request, signIn } from "@/api/test-client.ts";

   const cookie = await signIn("admin@example.com", "admin-test");
   const response = await request("/api/books", { method: "POST", body: { title: "Dune" }, cookie });
   expect(response.status).toBe(201);
   ```

5. **Mock** it, once a page calls it, for the web tests in `src/web/mocks/test.ts`, answering as the route does.

## Verify

```sh
bun run check:fix && bun run check
bun run test
```

To call the endpoint from the web app, use the `web-api-call` skill.
