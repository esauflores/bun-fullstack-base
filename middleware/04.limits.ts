import type { MiddlewareHandler } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { defineMiddleware } from "void";

import { env } from "@/config.ts";

/**
 * RATE_LIMIT requests a minute per client, then `429 { error }` with Retry-After, counted in memory. The client is
 * X-Real-IP, which Railway's edge sets on every public request, replacing any the client sent. Without it (locally),
 * all clients share one count.
 */
const rate: MiddlewareHandler = rateLimiter({
  limit: env.RATE_LIMIT,
  windowMs: 60_000,
  keyGenerator: (c) => c.req.header("x-real-ip") ?? "unknown",
  message: { error: "Too many requests, please try again later" },
});

/** Bodies over MAX_BODY_BYTES answer `413 { error }`, thrown so 01.errors.ts answers it as JSON. */
const body = bodyLimit({
  maxSize: env.MAX_BODY_BYTES,
  onError: () => {
    throw new HTTPException(413, { message: `The request body is over ${env.MAX_BODY_BYTES} bytes` });
  },
});

/**
 * Both limits on the API's requests, the health check aside; RATE_LIMIT=0 turns the rate limit off. Reading c.res sets
 * the RateLimit-* headers on a response now, which Hono merges into the route's own.
 */
export default defineMiddleware((c, next) => {
  const { path } = c.req;
  if (!(path === "/api" || path.startsWith("/api/")) || path === "/api/health") return next();
  if (env.RATE_LIMIT === 0) return body(c, next);
  return rate(c, async () => {
    void c.res;
    await body(c, next);
  });
});
