import { secureHeaders } from "hono/secure-headers";
import { defineMiddleware } from "void";

/** Security headers on every answer, page and API: no MIME sniffing, no framing. */
export default defineMiddleware(secureHeaders());
