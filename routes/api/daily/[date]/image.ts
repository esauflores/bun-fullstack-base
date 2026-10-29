import { HTTPException } from "hono/http-exception";
import { defineHandler } from "void";
import { z } from "zod";

import { cardImage } from "@/api/daily/daily.service.ts";

/**
 * GET /api/daily/{date}/image: the card's JPEG, from storage, cached for a day (browsers and Cloudflare's edge); 404
 * when there's none.
 */
export const GET = defineHandler.withValidator({ params: z.object({ date: z.iso.date() }) })(async (_c, { params }) => {
  const image = await cardImage(params.date);
  if (!image) throw new HTTPException(404, { message: "No such card" });
  return new Response(image.body, {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "public, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
});
