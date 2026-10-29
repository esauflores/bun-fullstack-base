import { defineHandler } from "void";

import { latestCard } from "@/api/daily/daily.service.ts";

/** GET /api/daily: `{ card }`, the newest daily card (its image at /api/daily/{date}/image), or null before the first. */
export const GET = defineHandler(async () => ({ card: await latestCard() }));
