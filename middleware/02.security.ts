import { secureHeaders } from "hono/secure-headers";
import { defineMiddleware } from "void";

const headers = secureHeaders();

/**
 * Security headers on every answer, page and API: no MIME sniffing, no framing. Not on a WebSocket's upgrade, whose
 * answer (101) can't take headers. An answer from a Durable Object (the live room's) has immutable headers, so the
 * answer is copied first.
 */
export default defineMiddleware((c, next) =>
  c.req.header("upgrade")
    ? next()
    : headers(c, async () => {
        await next();
        c.res = new Response(c.res.body, c.res);
      }),
);
