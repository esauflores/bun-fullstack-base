import { z } from "zod";

/** The name to greet, in the path: 1 to 50 characters. */
export const HelloParamsSchema = z.object({ name: z.string().min(1).max(50) });
