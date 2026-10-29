import { inject } from "vite-plus/test";

/** The test server's origin (test-server.ts). */
export const origin = inject("origin");

/** Runs the crons with this schedule, as Cloudflare's trigger would, through Void's dev endpoint. */
export const runCron = (cron: string) =>
  fetch(`${origin}/__void/scheduled`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-void-dev-trigger": inject("devTrigger") },
    body: JSON.stringify({ cron, scheduledTime: Date.now() }),
  });

/** A request to the test server, from its own origin (Better Auth takes the session only from it), as JSON. */
export function request(
  path: string,
  { method = "GET", body, cookie }: { method?: string; body?: unknown; cookie?: string } = {},
) {
  return fetch(`${origin}${path}`, {
    method,
    headers: {
      origin,
      ...(cookie ? { cookie } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** An account's session cookie, signed in through Better Auth's route. */
export async function signIn(email: string, password: string) {
  const response = await request("/api/auth/sign-in/email", { method: "POST", body: { email, password } });
  return response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}
