import { hashPassword } from "better-auth/crypto";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { requireAuth } from "void/auth";
import { db, eq } from "void/db";
import { env } from "void/env";

/** Better Auth's tables, as Void generates them from auth.ts (with the role): internal to Void, so by path. */
import { accountTable, userTable } from "../../../.void/better-auth-schema.ts";

/**
 * The accounts. The admin changes notes (the cron writes as it); its password is ADMIN_PASSWORD, or random and never
 * shown. The test account can only watch them, and its password is fixed
 * and on the page. Sign-up is off (auth.ts).
 */
function accounts() {
  return [
    {
      email: "admin@example.com",
      name: "Admin",
      role: "admin",
      password: () => env.ADMIN_PASSWORD ?? crypto.randomUUID(),
    },
    { email: "test@example.com", name: "Test", role: "user", password: () => "test1234" },
  ];
}

/**
 * Creates each account the database lacks: the user and its password (hashed) on a credential account, as Better
 * Auth's sign-up would, in one batch, a transaction on D1, so a user never lacks its password. Another instance making
 * the same account at that moment fails this batch on the email. Then the account exists, so that error is ignored;
 * any other error is thrown. middleware/00.accounts.ts runs it on a Worker instance's first request.
 */
export async function ensureAccounts() {
  for (const { password, ...account } of accounts()) {
    const [made] = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, account.email));
    if (made) continue;
    const id = crypto.randomUUID();
    const now = new Date();
    try {
      await db.batch([
        db.insert(userTable).values({ id, ...account, emailVerified: true, createdAt: now, updatedAt: now }),
        db.insert(accountTable).values({
          id: crypto.randomUUID(),
          accountId: id,
          providerId: "credential",
          userId: id,
          password: await hashPassword(password()),
          createdAt: now,
          updatedAt: now,
        }),
      ]);
    } catch (error) {
      const [raced] = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, account.email));
      if (!raced) throw error;
    }
  }
}

/** The signed-in admin: a 401 without a session, a 403 for any other user. For the routes that change notes. */
export function requireAdmin(c: Context) {
  const user = requireAuth(c) as ReturnType<typeof requireAuth> & { role?: string };
  if (user.role !== "admin") throw new HTTPException(403, { message: "Only the admin changes notes" });
  return user;
}
