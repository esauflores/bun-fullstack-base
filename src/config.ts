import { z } from "zod";

/** The settings, from the environment (Bun loads the repo root's .env), each with its default. */
const Env = z.object({
  /** The SQLite file. */
  DATABASE_PATH: z.string().default(".data/app.db"),
  /** Requests a minute per client on the API; 0 turns the limit off. */
  RATE_LIMIT: z.coerce.number().int().min(0).default(300),
  /** The largest request body, in bytes (1 MB). */
  MAX_BODY_BYTES: z.coerce.number().int().positive().default(1_048_576),
});

/** Empty values count as unset. */
const result = Env.safeParse(
  Object.fromEntries(Object.keys(Env.shape).map((name) => [name, process.env[name] || undefined])),
);
if (!result.success) throw new Error(`Invalid env: ${z.prettifyError(result.error)}`);

/**
 * The settings, read once, at start, failing on a bad value, naming it. Not named env.ts, which Void takes (in the
 * root or src/) for its schema (defineEnv, void/env), for its Cloudflare target, and refuses on Bun. This one reads
 * process.env, anywhere: the server, the tests and the scripts.
 */
export const env = result.data;
