import { defineConfig } from "void/config";

/**
 * Built for Bun (dist/ssr/index.js); the head every page starts from. The pages are written as HTML at build time
 * (output: "static"), as they fetch their data in the browser: the server only answers the API and serves files.
 */
export default defineConfig({
  target: "bun",
  output: "static",
  head: {
    title: "Bun fullstack base",
    htmlAttrs: { lang: "en" },
    bodyAttrs: { class: "antialiased" },
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "description",
        content: "A Void API and a React app served by one Bun server, typed end to end with Zod.",
      },
    ],
    link: [{ rel: "icon", href: "/favicon.svg" }],
    script: [
      {
        /** The saved theme, or the system's, set before the first paint so a dark page doesn't flash light. */
        innerHTML: `try { var theme = localStorage.getItem("theme"); } catch (error) {}
if (theme === "dark" || (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches))
  document.documentElement.classList.add("dark");`,
      },
    ],
  },
});
