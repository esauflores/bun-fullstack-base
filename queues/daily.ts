import { defineQueue } from "void";

import { consumeDays, type Day } from "@/api/daily/daily.consumer.ts";
import { writeCard } from "@/api/daily/daily.service.ts";

/** Up to 5 retries, 10 minutes apart, so a busy or failing AI gets an hour before the day is given up. */
export const maxRetries = 5;
export const retryDelay = 600;

/**
 * The daily card's consumer: writes each day's card (src/api/daily/daily.service.ts), retrying a failed day on its own
 * (src/api/daily/daily.consumer.ts): when the AI's usage limit resets, or after retryDelay for any other failure.
 */
export default defineQueue<Day>((batch) => consumeDays(batch.messages, writeCard));
