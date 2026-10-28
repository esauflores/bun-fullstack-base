import { expect, it } from "vite-plus/test";

import { addNote, listNotes } from "./notes.service.ts";

/** The routes' tests (notes.test.ts) cover the rest; paging through every note takes more pages than they read. */
it("pages through every note once, newest first, and ends with no next", () => {
  const added: number[] = [];
  for (let i = 0; i < 5; i++) added.push(addNote(`Note ${i}`).id);
  const seen: number[] = [];
  let before: number | undefined;
  do {
    const page = listNotes({ limit: 2, before });
    seen.push(...page.notes.map((n) => n.id));
    before = page.next ?? undefined;
  } while (before !== undefined);

  expect(seen.filter((id) => added.includes(id))).toEqual([...added].reverse());
  expect(new Set(seen).size).toBe(seen.length);
});
