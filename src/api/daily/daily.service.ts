import { ai } from "void/ai";
import { db, desc, lt } from "void/db";
import { env } from "void/env";
import { storage } from "void/storage";

import { daily } from "@schema/daily.ts";

/** A daily card, as the API answers it: its image is at /api/daily/{date}/image. */
export type Card = typeof daily.$inferSelect;

/** Workers AI's models: a small, cheap one for the text (~10 neurons), and Flux Schnell for the image (~60). */
const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
const IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";

/** How many days of cards are kept, text and image. */
const KEEP_DAYS = 7;

const imageKey = (date: string) => `daily/${date}.jpg`;

/** A 1×1 JPEG, AI_FAKE's image. */
const FAKE_IMAGE =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AP//Z";

/** A short poem about building software, from the text model; AI_FAKE's fixed one in tests. */
async function writePoem() {
  if (env.AI_FAKE) return "Code compiles at dawn\nthe cron wakes, the queue replies\ntests pass, green and calm";
  const { response } = (await ai.run(TEXT_MODEL, {
    messages: [
      { role: "system", content: "Answer with the poem only: no title, no quotes, no explanation." },
      { role: "user", content: "Write a haiku about building software, in English." },
    ],
    max_tokens: 80,
  })) as { response?: string };
  if (!response?.trim()) throw new Error("The text model answered no poem");
  return response.trim();
}

/** An image for the poem, from Flux Schnell (a base64 JPEG); AI_FAKE's 1×1 one in tests. */
async function paint(poem: string) {
  if (env.AI_FAKE) return Uint8Array.from(atob(FAKE_IMAGE), (c) => c.charCodeAt(0));
  const { image } = (await ai.run(IMAGE_MODEL, { prompt: `A calm illustration of: ${poem}`, steps: 4 })) as {
    image?: string;
  };
  if (!image) throw new Error("The image model answered no image");
  return Uint8Array.from(atob(image), (c) => c.charCodeAt(0));
}

/**
 * Makes `date`'s card: a poem, an image of it (stored at daily/<date>.jpg), then the row, replacing one made before
 * (a retry). Cards older than KEEP_DAYS go, with their images. Throws when the AI fails, for the queue to retry.
 */
export async function writeCard(date: string) {
  const text = await writePoem();
  await storage.put(imageKey(date), await paint(text), { httpMetadata: { contentType: "image/jpeg" } });
  const createdAt = new Date().toISOString();
  await db
    .insert(daily)
    .values({ date, text, createdAt })
    .onConflictDoUpdate({ target: daily.date, set: { text, createdAt } });
  const oldest = new Date(Date.parse(date) - (KEEP_DAYS - 1) * 86_400_000).toISOString().slice(0, 10);
  const old = await db.delete(daily).where(lt(daily.date, oldest)).returning({ date: daily.date });
  await Promise.all(old.map((card) => storage.delete(imageKey(card.date))));
}

/** The newest card, or null before the first. */
export async function latestCard(): Promise<Card | null> {
  const [card] = await db.select().from(daily).orderBy(desc(daily.date)).limit(1);
  return card ?? null;
}

/** A card's image from storage, or null when there's none. */
export const cardImage = (date: string) => storage.get(imageKey(date));
