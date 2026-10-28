import { fetch } from "void/client";

/**
 * The API's typed client, Void's: `api("/api/hello/:name", { params: { name } })`. Its paths, methods, params, query
 * and body are checked against routes/ (the routes' validators), and its answer is typed from the handler's return. A
 * non-2xx answer throws Void's FetchError, with the status (`error.response`) and the `{ error }` body (`error.data`).
 * Retries are left to TanStack Query (pages/layout.tsx), so the client makes one attempt. The one cast keeps fetch's
 * overloads, which a wrapper can't infer.
 */
export const api = ((path: never, options?: object) => fetch(path, { retry: 0, ...options })) as typeof fetch;
