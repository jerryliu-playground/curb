import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";

describe("server", () => {
  it("answers the health check", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });
});
