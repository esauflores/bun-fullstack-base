/**
 * Values the API and the web app share: plain constants, no server code, so the page may import them (the lint rule
 * allows `@/shared/`).
 */

/** How long a note lives: listed for 25 minutes after createdAt, then deleted by the cron (crons/notes.ts). */
export const NOTE_TTL_MS = 25 * 60_000;

/** The demo's viewer account (src/api/auth/accounts.ts), which the sign-in form fills in. The admin's is secret. */
export const TEST_USER = { email: "test@example.com", password: "test1234" };
