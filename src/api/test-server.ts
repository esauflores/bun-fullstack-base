import { voidReact } from "@void/react/plugin";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite-plus";
import type { TestProject } from "vite-plus/test/node";
import { voidPlugin } from "void";

declare module "vite-plus/test" {
  interface ProvidedContext {
    /** The API test server's origin, http://localhost:<port>. */
    origin: string;
    /** Its folder of local state (D1, Durable Objects), as Miniflare keeps it. */
    state: string;
    /** The token Void's dev routes take, as /__void/scheduled (runs the crons) in the x-void-dev-trigger header. */
    devTrigger: string;
  }
}

/**
 * The API tests' server: Void's dev server, the Worker in Miniflare (workerd) with a fresh local D1 in a temporary
 * folder, migrated at start. The tests request it over HTTP, as the Worker's code runs only in workerd. The admin's
 * password is set, so the tests can sign in as either, and the AI is faked
 * (AI_FAKE), so they spend nothing.
 */
export default async function setup(project: TestProject) {
  const state = await mkdtemp(join(tmpdir(), "api-test-"));
  process.env.ADMIN_PASSWORD = "admin-test";
  process.env.AI_FAKE = "true";
  const server = await createServer({
    configFile: false,
    root: join(import.meta.dirname, "../.."),
    resolve: { alias: { "@": join(import.meta.dirname, "..") } },
    plugins: [voidPlugin({ persistTo: state }), voidReact()],
    server: { port: 0 },
    logLevel: "error",
  });
  await server.listen();
  project.provide("origin", server.resolvedUrls!.local[0]!.replace(/\/$/, ""));
  project.provide("state", state);
  project.provide("devTrigger", (await readFile(join(server.config.root, ".void/dev-trigger-token"), "utf8")).trim());
  return async () => {
    await server.close();
    await rm(state, { recursive: true, force: true });
  };
}
