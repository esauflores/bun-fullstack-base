import { UsageLimit } from "void/limits";

/** A day to make the card of, as YYYY-MM-DD (UTC). */
export interface Day {
  date: string;
}

/** What the consumer uses of a queue message. */
interface DayMessage {
  body: Day;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}

/**
 * Makes each day's card with `write`, acking or retrying each message on its own, so one failure doesn't hold up the
 * rest of the batch. Over the AI's usage limit, the day is retried when the limit says it resets (a minute at least);
 * any other failure is logged and retried after the queue's retryDelay.
 */
export async function consumeDays(messages: readonly DayMessage[], write: (date: string) => Promise<unknown>) {
  for (const message of messages) {
    try {
      await write(message.body.date);
      message.ack();
    } catch (error) {
      if (error instanceof UsageLimit && error.retryAt) {
        message.retry({ delaySeconds: Math.max(60, Math.ceil((Date.parse(error.retryAt) - Date.now()) / 1000)) });
      } else {
        console.error(`The card for ${message.body.date} failed`, error);
        message.retry();
      }
    }
  }
}
