import { useQuery } from "@tanstack/react-query";

import { api } from "@/web/lib/api.ts";

/**
 * Today's card: a haiku and its image, which Workers AI makes once a day (crons/daily.ts → queues/daily.ts). Before
 * the first, a note saying when it comes.
 */
export function DailyCard() {
  const daily = useQuery({ queryKey: ["daily"], queryFn: () => api("/api/daily") });
  const card = daily.data?.card;

  if (!card) {
    return (
      <p className="rounded-xl border bg-card px-5 py-4 text-sm text-subtle">
        {daily.isPending ? "Loading…" : "No card yet: the first is made at 06:00 UTC."}
      </p>
    );
  }

  return (
    <figure className="flex flex-wrap items-center gap-6 overflow-hidden rounded-xl border bg-card">
      <img
        src={`/api/daily/${card.date}/image?v=${encodeURIComponent(card.createdAt)}`}
        alt={`An illustration of the haiku: ${card.text}`}
        className="aspect-square w-full max-w-72 bg-muted object-cover"
      />
      <figcaption className="flex-[1_1_240px] px-5 py-4">
        <p className="text-lg whitespace-pre-line">{card.text}</p>
        <p className="mt-3 font-mono text-xs text-subtle">{card.date} · Workers AI</p>
      </figcaption>
    </figure>
  );
}
