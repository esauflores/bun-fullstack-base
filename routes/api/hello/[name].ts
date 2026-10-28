import { defineHandler } from "void";

import { HelloParamsSchema } from "@/api/hello/hello.schemas.ts";
import { greet } from "@/api/hello/hello.service.ts";

/** GET /api/hello/{name}: a greeting, the name 1 to 50 characters (400 otherwise). */
export const GET = defineHandler.withValidator({ params: HelloParamsSchema })((_c, { params }) => greet(params.name));
