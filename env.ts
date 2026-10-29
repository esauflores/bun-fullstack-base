import { boolean, defineEnv, number, string } from "void/env";

/**
 * The settings (`env` from void/env): `.env` locally, `void secret put <NAME>` in production. Checked at start, failing
 * on a bad value.
 */
export default defineEnv({
  /** The largest request body the API reads, in bytes (1 MB). */
  MAX_BODY_BYTES: number().default(1_048_576),
  /** The admin account's password (admin@example.com): a random one, never shown, when unset, as the cron writes. */
  ADMIN_PASSWORD: string().optional(),
  /**
   * Fixed AI answers for the daily card (src/api/daily/daily.service.ts) instead of Workers AI's, which in dev needs a
   * Cloudflare login and spends the account's allowance: on in the tests, and in dev when set in `.env`.
   */
  AI_FAKE: boolean().default(false),
});
