import tailwindcss from "@tailwindcss/vite";
import { voidReact } from "@void/react/plugin";
import { msw } from "msw/vite";
import { join } from "node:path";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";
import { voidPlugin } from "void";

import { devCrons } from "./plugins/dev-crons.ts";

/**
 * One Vite config for everything. Void serves routes/ (the API) and pages/ (the web app) from one Worker, in dev (in
 * Miniflare) and on Cloudflare. Vite+ checks and tests the code: `vp check` formats, lints and type-checks; `vp test`
 * runs the API tests against a dev server and the web tests in headless Chromium.
 */

/** The `@/` alias (src/), for the app and both test projects. `@schema/` (db/schema/) is Void's own. */
const alias = { "@": join(import.meta.dirname, "src") };

export default defineConfig({
  resolve: { alias },
  /** `bun run dev` on port 3000. */
  server: { port: 3000 },
  plugins: [
    /** Not in the tests: the web tests run without Void, and the API tests start their own server. */
    ...(process.env.VITEST ? [] : [voidPlugin(), voidReact(), devCrons()]),
    tailwindcss(),
  ],
  test: {
    /**
     * 1s, not 10s, to wait for the servers to close: Cloudflare's Vite plugin never closes the remote Workers AI proxy
     * the API tests' server opens (cloudflare/workers-sdk#15269, unreleased), so Vitest always waits it out. Back to the
     * default once that ships.
     */
    teardownTimeout: 1_000,
    projects: [
      {
        /** The API's tests, over HTTP against a Void dev server that test-server.ts starts. */
        resolve: { alias },
        test: {
          name: "api",
          include: ["src/api/**/*.test.ts"],
          globalSetup: ["src/api/test-server.ts"],
          /** Vitest's 5s default is too short for a cold Worker under the parallel run (the web tests start Chromium). */
          testTimeout: 30_000,
        },
      },
      {
        /** Not extending the root: the web tests run the components in Chromium against MSW, without Void. */
        resolve: { alias },
        /** MSW's service worker, which the web tests register, served from the package at /mockServiceWorker.js. */
        plugins: [msw({ mode: "worker-only" })],
        test: {
          name: "web",
          include: ["src/web/**/*.test.{ts,tsx}", "pages/**/_*.test.{ts,tsx}"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
  fmt: {
    tabWidth: 2,
    printWidth: 120,
    sortImports: {
      order: "asc",
      newlinesBetween: true,
      internalPattern: ["@/", "@schema/"],
      groups: [["builtin", "external"], "internal", ["parent", "sibling", "index"], "style", "unknown"],
    },
  },
  lint: {
    categories: { correctness: "error" },
    options: { typeAware: true, typeCheck: true },
    overrides: [
      {
        // The web app runs in the browser: importing the server's code would bundle it into the page.
        files: ["src/web/**", "pages/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                {
                  group: ["@/api/**", "@schema/**"],
                  allowTypeImports: true,
                  message: "Server code: types only",
                },
              ],
            },
          ],
        },
      },
    ],
  },
});
