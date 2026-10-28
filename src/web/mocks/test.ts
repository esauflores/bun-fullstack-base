import { it as base } from "vite-plus/test";

import { worker } from "./worker.ts";

/**
 * `it`, with the page's API answered by the handlers of MSW's worker (worker.ts): tests are hermetic and fast, and can
 * answer what the real API never would: a 502, an offline health check. A test overrides one route for its case with
 * `({ worker }) => worker.use(http.get(…))`, reset after it. Unmocked routes answer 500 { error } and show on screen.
 * The fixture takes `{}`: Vitest reads a fixture's dependencies from its first parameter, which must be a destructuring
 * pattern.
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
