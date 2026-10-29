import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { defineMiddleware } from "void";
import { env } from "void/env";

const log = logger((line) => console.log(line));

/**
 * The API's requests, not the health check: logged (`<--` on arrival, `-->` when answered), and a body over
 * MAX_BODY_BYTES answers `413 { error }`, thrown so 01.errors.ts answers it as JSON.
 */
export default defineMiddleware((c, next) => {
  const { path } = c.req;
  if (!path.startsWith("/api/") || path === "/api/health") return next();
  const limit = bodyLimit({
    maxSize: env.MAX_BODY_BYTES,
    onError: () => {
      throw new HTTPException(413, { message: `The request body is over ${env.MAX_BODY_BYTES} bytes` });
    },
  });
  return log(c, async () => {
    await limit(c, next);
  });
});
