import { defineMiddleware } from "void";

import { ensureAccounts } from "@/api/auth/accounts.ts";

/** Whether this Worker instance has made sure the accounts exist: once each, as a fresh database has none. */
let ready = false;

/** Makes the accounts on the instance's first request, before anything can sign in with them. */
export default defineMiddleware(async (_c, next) => {
  if (!ready) {
    await ensureAccounts();
    ready = true;
  }
  await next();
});
