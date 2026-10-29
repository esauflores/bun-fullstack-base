import { defineConfig } from "void/config";

/**
 * A Worker on Cloudflare (Void's default target), named fullstack-demo, with D1 for the database. `/` is the same for
 * every visitor (the session and the notes load in the browser), so it's rendered once per deploy into the ISR cache,
 * which `routing.isr` lets Void create without asking; other pages render on each request. Not `output: "static"`: that
 * prerenders in the build, where Better Auth has no secret.
 */
export default defineConfig({
  worker: { compatibility_date: "2026-02-24" },
  cloudflare: { name: "fullstack-demo" },
  routing: { isr: true, prerender: ["/"] },
  head: {
    title: "Fullstack base",
    htmlAttrs: { lang: "en" },
    bodyAttrs: { class: "antialiased" },
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "description",
        content: "A Void app on Cloudflare: an API and a React app, typed end to end with Zod, on D1.",
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
