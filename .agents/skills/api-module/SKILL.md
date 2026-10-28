---
name: api-module
description: Add a feature module to the API (a table in db/schema/, schemas and service in src/api/<module>/, Void file routes in routes/api/, tests), validated by Zod and callable from the web app's typed client. Use when adding a new resource or feature to the API, e.g. "add a books API" or "add endpoints for invoices".
compatibility: Bun 1.4+. Run commands from the repo root.
---

# Add an API module

The rules are in `src/api/README.md`; `src/api/notes/` and `routes/api/notes/` are the example to copy. Replace
`books`/`Book` with the module's name.

## Steps

1. **Table**, when the module stores data, in its own file, `db/schema/books.ts`. Then `bun run db:generate` writes the
   migration into `db/migrations/` (commit it), which the server applies when it first opens the database. Never edit a
   migration that exists: change the table and generate another.

   ```ts
   import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

   export const books = sqliteTable("books", {
     id: integer().primaryKey({ autoIncrement: true }),
     title: text().notNull(),
   });
   ```

2. **Schemas**, `src/api/books/books.schemas.ts`: the Zod schemas of the module's input, exported, with doc comments.

   ```ts
   import { z } from "zod";

   /** A book's id, in the path: a positive whole number. */
   export const BookIdSchema = z.object({ id: z.coerce.number().int().positive() });
   ```

3. **Service**, `src/api/books/books.service.ts`: plain functions with doc comments, no HTTP. Only this module's
   service queries its table, through `db` from `@db/client.ts`, and the queries are synchronous (no `async`). A
   domain failure throws an `HTTPException` with a 4xx status, answered as `{ error: message }`. A query that runs on
   most requests is prepared once, as in `src/api/notes/notes.service.ts`.

   ```ts
   import { eq } from "drizzle-orm";
   import { HTTPException } from "hono/http-exception";

   import { db } from "@db/client.ts";
   import { books } from "@db/schema/books.ts";

   /** A book by its id; a 404 HTTPException when there's no such book. */
   export function findBook(id: number) {
     const [book] = db.select().from(books).where(eq(books.id, id)).all();
     if (!book) throw new HTTPException(404, { message: "No such book" });
     return book;
   }
   ```

4. **Routes**, one file per path under `routes/api/books/` (Void serves them, no mounting): a named export per method,
   validated, calling the service. More routes: the `api-endpoint` skill.

   ```ts
   // routes/api/books/[id].ts
   import { defineHandler } from "void";

   import { BookIdSchema } from "@/api/books/books.schemas.ts";
   import { findBook } from "@/api/books/books.service.ts";

   /** GET /api/books/{id}: a book, 404 when there's no such book. */
   export const GET = defineHandler.withValidator({ params: BookIdSchema })((_c, { params }) => findBook(params.id));
   ```

5. **Tests**, next to the code: `books.service.test.ts` calls the service directly; `books.test.ts` calls the routes
   through Void's app (`import app from "virtual:void-routes"`, then `app.request("/api/books/1")`): the success, each
   error, and a 400. Each test file has a fresh in-memory database, so create the rows a test reads.

6. **Mock** its routes, once a page calls them, for the web tests in `src/web/mocks/worker.ts`. The web app calls
   them with `api("/api/books/:id", { params: { id } })`, typed from the routes (`web-api-call` skill).

## Verify

```sh
bun run check:fix && bun run check
bun run test
```
