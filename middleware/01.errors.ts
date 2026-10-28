import { HTTPException } from "hono/http-exception";
import { defineMiddleware } from "void";

/**
 * Every API error as `{ error }`: an unknown path answers 404 (not the web app's page), an HTTPException keeps its
 * status and message (a response it carries, as basic auth builds, is kept as is); anything else was logged by Void
 * and answers 500, without its details.
 */
export default defineMiddleware(async (c, next) => {
  await next();
  const { error } = c;
  const isApi = c.req.path === "/api" || c.req.path.startsWith("/api/");
  if (!isApi) return;
  if (!error) {
    if (c.res.status === 404 && !c.res.headers.get("content-type")?.includes("json")) {
      c.res = c.json({ error: "Not Found" }, 404);
    }
    return;
  }
  if (error instanceof HTTPException) {
    if (!error.res) c.res = c.json({ error: error.message }, error.status);
    return;
  }
  c.res = c.json({ error: "Internal Server Error" }, 500);
});
