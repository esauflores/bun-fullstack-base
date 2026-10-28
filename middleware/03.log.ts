import { logger } from "hono/logger";
import { defineMiddleware } from "void";

const log = logger((line) => console.log(line));

/** The request log, `<--` on arrival and `-->` when answered: the API's requests, not the health check. */
export default defineMiddleware((c, next) => {
  const { path } = c.req;
  return (path === "/api" || path.startsWith("/api/")) && path !== "/api/health" ? log(c, next) : next();
});
