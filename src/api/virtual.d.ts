/** The app as Void serves it, built from routes/ and middleware/: its Vite plugin resolves it, in dev and in the tests. */
declare module "virtual:void-routes" {
  const app: import("hono").Hono;
  export default app;
}
