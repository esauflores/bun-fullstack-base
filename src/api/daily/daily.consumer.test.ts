import { describe, expect, it, vi } from "vite-plus/test";
import { UsageLimit } from "void/limits";

import { consumeDays } from "@/api/daily/daily.consumer.ts";

/** A queue message for a day, with its ack and retry as mocks. */
const message = (date: string) => ({ body: { date }, ack: vi.fn(), retry: vi.fn() });

describe("the daily card's consumer", () => {
  it("retries a day over the AI's usage limit when the limit resets, a minute at least", async () => {
    const soon = message("2026-01-01");
    const later = message("2026-01-02");
    const limit = (minutes: number) =>
      new UsageLimit({
        resource: "ai",
        reason: "rate_limit",
        message: "Over the limit",
        retryAt: new Date(Date.now() + minutes * 60_000).toISOString(),
      });

    await consumeDays([soon, later], async (date) => {
      throw limit(date === "2026-01-01" ? 0 : 30);
    });

    expect(soon.retry).toHaveBeenCalledWith({ delaySeconds: 60 });
    expect(later.retry.mock.calls[0]![0].delaySeconds).toBeGreaterThan(29 * 60);
    expect(soon.ack).not.toHaveBeenCalled();
  });

  it("retries a failed day on its own and goes on with the rest of the batch", async () => {
    const failing = message("2026-01-01");
    const fine = message("2026-01-02");
    vi.spyOn(console, "error").mockImplementation(() => {});

    await consumeDays([failing, fine], async (date) => {
      if (date === "2026-01-01") throw new Error("R2 is down");
    });

    expect(failing.retry).toHaveBeenCalledWith();
    expect(failing.ack).not.toHaveBeenCalled();
    expect(fine.ack).toHaveBeenCalled();
    expect(fine.retry).not.toHaveBeenCalled();
  });
});
