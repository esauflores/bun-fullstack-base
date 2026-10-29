import { describe, expect, it } from "vite-plus/test";

import { request } from "@/api/test-client.ts";

describe("GET /api/hello/{name}", () => {
  it("decodes a URL-encoded name in the hello route", async () => {
    const response = await request("/api/hello/Ada%20Lovelace");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Hello, Ada Lovelace!" });
  });

  it("rejects an invalid name with a 400, its issue at the name", async () => {
    const response = await request(`/api/hello/${"a".repeat(51)}`);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Validation failed",
      issues: [{ slot: "params", issues: [{ path: "name", message: expect.stringContaining("<=50 characters") }] }],
    });
  });
});
