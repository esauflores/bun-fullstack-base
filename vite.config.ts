import tailwindcss from "@tailwindcss/vite";
import { voidReact } from "@void/react/plugin";
import { msw } from "msw/vite";
import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";
import { voidPlugin } from "void";

/**
 * One Vite config for everything. Void serves routes/ (the API) and pages/ (the web app) on one port, in
 * dev and from the build (dist/ssr/index.js, on Bun). Vite+ checks and tests the code: `vp check` formats, lints and
 * type-checks; `vp test` runs the API tests on Bun and the web tests in headless Chromium.
 */
const root = fileURLToPath(new URL(".", import.meta.url));

/** The `@/` (src/) and `@db/` (db/) aliases, for the app and both test projects. */
const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  "@db": fileURLToPath(new URL("./db", import.meta.url)),
};

/**
 * Void's plugins: the app's, and the API tests'. Not the web tests': Void's dev server would answer Vitest's own
 * module requests in the browser.
 */
const voidPlugins = () => [voidPlugin(), voidReact()];

export default defineConfig({
  resolve: { alias },
  /** `bun run dev` on PORT (3000), as the built server, which reads it itself. */
  server: { port: Number(process.env.PORT) || 3000 },
  plugins: [
    ...(process.env.VITEST ? [] : voidPlugins()),
    tailwindcss(),
    {
      /**
       * The server's build takes its dependencies in, so dist/ runs without node_modules; Bun's own modules stay
       * imports. Only the build: dev and the tests load dependencies from node_modules, CommonJS ones included.
       */
      name: "bundle-server",
      apply: "build",
      config: () => ({ ssr: { noExternal: true, external: ["bun:sqlite"] } }),
    },
    {
      /** The migrations, beside the server's entry, where db/client.ts reads them in the build. */
      name: "migrations",
      apply: "build",
      closeBundle() {
        if (this.environment?.name !== "ssr") return;
        cpSync(`${root}db/migrations`, `${root}dist/ssr/migrations`, { recursive: true });
      },
    },
  ],
  test: {
    env: { DATABASE_PATH: ":memory:" },
    projects: [
      {
        extends: true,
        plugins: voidPlugins(),
        test: {
          name: "api",
          include: ["src/api/**/*.test.ts"],
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
      internalPattern: ["@/", "@db/"],
      groups: [["builtin", "external"], "internal", ["parent", "sibling", "index"], "style", "unknown"],
    },
  },
  lint: {
    /** .railway/ has its own package (railway/iac), installed only where `railway config` runs, not in CI. */
    ignorePatterns: [".railway/**"],
    categories: { correctness: "error" },
    options: { typeAware: true, typeCheck: true },
    overrides: [
      {
        // The web app runs in the browser: importing the server's code would bundle it (and bun:sqlite) into the page.
        files: ["src/web/**", "pages/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [{ group: ["@/api/**", "@db/**"], allowTypeImports: true, message: "Server code: types only" }],
            },
          ],
        },
      },
    ],
  },
});
