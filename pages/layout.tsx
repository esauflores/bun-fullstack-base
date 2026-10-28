import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { FetchError } from "void/client";

import "@/web/styles/global.css";

/**
 * The query client retries what may pass next time (a 5xx or a network error) up to 3 times, and shows a 4xx at once:
 * the same request would fail the same way.
 */
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failures, error) =>
          failures < 3 && !(error instanceof FetchError && (error.response?.status ?? 500) < 500),
      },
    },
  });

/** Every page's frame: the stylesheet and one query client for the page's lifetime. */
export default function Layout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
