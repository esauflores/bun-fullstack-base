import { defineAuth } from "void/auth";

/**
 * Better Auth, as Void configures it (sessions in a cookie, its endpoints under /api/auth/, its tables beside the
 * app's), with sign-up off and a `role` on each user: `admin` or `user`. The accounts are made by
 * src/api/auth/accounts.ts. Its per-IP limits (3 sign-ins per 10 seconds) count in D1, so every Worker instance
 * shares one count.
 */
export default defineAuth(({ defaults }) => ({
  ...defaults,
  rateLimit: { ...defaults.rateLimit, storage: "database" },
  emailAndPassword: { ...defaults.emailAndPassword, enabled: true, disableSignUp: true, minPasswordLength: 8 },
  user: { ...defaults.user, additionalFields: { role: { type: "string", defaultValue: "user", input: false } } },
}));
