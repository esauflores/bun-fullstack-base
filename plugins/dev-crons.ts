import { Cron } from "croner";
import { readdirSync, readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import type { Plugin } from "vite-plus";

/** The project, one folder up. */
const root = join(import.meta.dirname, "..");

/**
 * The schedules in crons/, as Void reads them: each file's `export const cron`, a string or an array of them. Files
 * and folders starting with _ aren't crons. Deduplicated, as one trigger runs every file with that schedule.
 */
function schedules() {
  const found = readdirSync(join(root, "crons"), { recursive: true, encoding: "utf8" })
    .filter((file) => /\.[mc]?[jt]s$/.test(file) && !file.split("/").some((part) => part.startsWith("_")))
    .flatMap((file) => {
      const value = readFileSync(join(root, "crons", file), "utf8").match(/export const cron\s*=\s*([^;]+)/)?.[1];
      return [...(value ?? "").matchAll(/["'`]([^"'`]+)["'`]/g)].map((match) => match[1]!);
    });
  return [...new Set(found)];
}

/**
 * The crons, run in dev as Cloudflare runs them deployed: Void only prints a `curl` for them, as neither it nor
 * Cloudflare's local runtime fires a Cron Trigger. Each schedule in crons/ fires on its own times (UTC, as
 * Cloudflare's), through Void's dev endpoint and its token; and once at start, when the Worker first answers, so dev
 * doesn't wait for the first. A cron added or rescheduled takes a dev restart. Dev only.
 */
export function devCrons(): Plugin {
  return {
    name: "dev-crons",
    apply: "serve",
    configureServer(server) {
      const crons = schedules();
      if (process.env.VITEST || crons.length === 0) return;
      server.httpServer?.once("listening", () => {
        const { port } = server.httpServer!.address() as AddressInfo;
        const run = (cron: string) => {
          const token = readFileSync(join(root, ".void/dev-trigger-token"), "utf8").trim();
          void fetch(`http://localhost:${port}/__void/scheduled`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-void-dev-trigger": token },
            body: JSON.stringify({ cron, scheduledTime: Date.now() }),
          }).catch(() => {});
        };
        let closed = false;
        /** The first run once the Worker answers its health check, which takes a while as dev starts; none once closed. */
        const ready = async () => {
          while (!closed) {
            const ok = await fetch(`http://localhost:${port}/api/health`).then(
              (response) => response.ok,
              () => false,
            );
            if (ok) return crons.forEach(run);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        };
        void ready();
        const jobs = crons.map((cron) => new Cron(cron, { timezone: "UTC" }, () => run(cron)));
        server.httpServer!.once("close", () => {
          closed = true;
          jobs.forEach((job) => job.stop());
        });
      });
    },
  };
}
