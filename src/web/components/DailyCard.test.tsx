import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, expect } from "vite-plus/test";

import { it } from "@/web/mocks/test.ts";

import { DailyCard } from "./DailyCard.tsx";

afterEach(cleanup);

const renderCard = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DailyCard />
    </QueryClientProvider>,
  );

it("says when the first card comes, before there is one", async () => {
  renderCard();

  expect(await screen.findByText(/first is made at 06:00 UTC/)).toBeTruthy();
});

it("shows the day's haiku and its image", async ({ worker }) => {
  const card = { date: "2026-10-28", text: "Code compiles at dawn", createdAt: "2026-10-28T06:00:00.000Z" };
  worker.use(http.get("/api/daily", () => HttpResponse.json({ card })));
  renderCard();

  expect(await screen.findByText(card.text)).toBeTruthy();
  expect(screen.getByRole("img").getAttribute("src")).toBe(
    "/api/daily/2026-10-28/image?v=2026-10-28T06%3A00%3A00.000Z",
  );
});
