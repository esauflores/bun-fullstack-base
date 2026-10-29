import { defineQueue } from "void";
import { UsageLimit } from "void/limits";

import { writeCard } from "@/api/daily/daily.service.ts";

/** A day to make the card of, as YYYY-MM-DD (UTC). */
interface Day {
  date: string;
}

/** Up to 5 retries, 10 minutes apart, so a busy or failing AI gets an hour before the day is given up. */
export const maxRetries = 5;
export const retryDelay = 600;

/**
 * The daily card's consumer: writes the day's card (src/api/daily/daily.service.ts). Over the AI's usage limit, it
 * retries when the limit says it resets; any other failure throws, which the queue retries after retryDelay.
 */
export default defineQueue<Day>(async (batch) => {
  for (const message of batch.messages) {
    try {
      await writeCard(message.body.date);
      message.ack();
    } catch (error) {
      if (!(error instanceof UsageLimit) || !error.retryAt) throw error;
      message.retry({ delaySeconds: Math.max(60, Math.ceil((Date.parse(error.retryAt) - Date.now()) / 1000)) });
    }
  }
});
