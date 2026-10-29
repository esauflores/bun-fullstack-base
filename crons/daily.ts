import { defineScheduled } from "void";
import { queues } from "void/queues";

/** Daily at 06:00 UTC, by Cloudflare's Cron Trigger (in dev, by plugins/dev-crons.ts, also once at start). */
export const cron = "0 6 * * *";

/** Queues today's card (queues/daily.ts): the AI is slow and can fail or hit its limit, which the queue retries. */
export default defineScheduled(async () => {
  await queues.daily.send({ date: new Date().toISOString().slice(0, 10) });
});
