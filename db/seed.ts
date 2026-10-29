import { defineSeed } from "void/seed";

/**
 * Local notes for `void db seed` (it resets the local database first): five, 5 minutes apart, so the page has a full
 * list without waiting for the cron. The accounts aren't seeded: middleware/00.accounts.ts makes them on every start,
 * in production too.
 */
export default defineSeed<typeof import("./schema")>(async ({ db, schema }) => {
  const now = Date.now();
  await db.insert(schema.notes).values(
    Array.from({ length: 5 }, (_, i) => ({
      text: `Seeded note ${i + 1}`,
      author: "Admin",
      createdAt: new Date(now - (4 - i) * 5 * 60_000).toISOString(),
    })),
  );
});
