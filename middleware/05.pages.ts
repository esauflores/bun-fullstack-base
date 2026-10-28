import { fileURLToPath } from "node:url";
import { defineMiddleware } from "void";

/** dist/client/, from the server's build (dist/ssr/assets/), where output: "static" writes the pages. */
const root = fileURLToPath(new URL("../../client/", import.meta.url));

/** Each prerendered page by its path: index.html is `/`, books.html `/books`. Only the build has them. */
const pages = new Map(
  import.meta.env.PROD
    ? Array.from(new Bun.Glob("**/*.html").scanSync(root), (file) => {
        const path = file.replace(/\.html$/, "").replace(/(^|\/)index$/, "");
        return [`/${path}`, `${root}${file}`];
      })
    : [],
);

/**
 * The pages, as the files the build wrote: Void's Bun server serves only /assets/ and would render them again on
 * every request. Last in line, so the security headers and the log still apply.
 */
export default defineMiddleware(async (c, next) => {
  const file = c.req.method === "GET" ? pages.get(c.req.path) : undefined;
  if (!file) return next();
  return c.body(Bun.file(file).stream(), 200, { "content-type": "text/html; charset=utf-8" });
});
