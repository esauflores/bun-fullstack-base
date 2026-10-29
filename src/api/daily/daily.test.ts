import { describe, expect, it, vi } from "vite-plus/test";

import { request, runCron } from "@/api/test-client.ts";

describe("the daily card", () => {
  it("is made by the daily cron, through its queue, with its image in storage", async () => {
    expect((await runCron("0 6 * * *")).ok).toBe(true);

    /** The cron only queues the day; its consumer (queues/daily.ts) makes the card right after. */
    const today = new Date().toISOString().slice(0, 10);
    const card = await vi.waitFor(
      async () => {
        const { card } = (await (await request("/api/daily")).json()) as {
          card: { date: string; text: string } | null;
        };
        expect(card?.date).toBe(today);
        return card!;
      },
      { timeout: 20_000 },
    );
    expect(card.text).toContain("Code compiles at dawn");

    const image = await request(`/api/daily/${today}/image`);
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/jpeg");
    expect(new Uint8Array(await image.arrayBuffer()).slice(0, 2)).toEqual(new Uint8Array([0xff, 0xd8]));
  });

  it("answers 404 for a day without a card, and 400 for a date that isn't one", async () => {
    expect((await request("/api/daily/2000-01-01/image")).status).toBe(404);
    expect((await request("/api/daily/someday/image")).status).toBe(400);
  });
});
