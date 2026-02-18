import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { Bindings } from "../types/env";
import { bearerAuth } from "./auth";

const AUTH_TOKEN = "test-secret-token";

function createApp() {
  const app = new Hono<{ Bindings: Bindings }>();
  return app;
}

describe("bearerAuth", () => {
  const app = createApp();
  app.use("/api/*", bearerAuth);
  app.get("/api/data", (c) => c.json({ ok: true }));

  const env = { AUTH_TOKEN } as Bindings;

  it("有効な Bearer token 付きリクエストで 200 を返す", async () => {
    const res = await app.request(
      "/api/data",
      { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } },
      env,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("Authorization ヘッダーなしで 401 を返す", async () => {
    const res = await app.request("/api/data", {}, env);
    expect(res.status).toBe(401);
  });

  it("無効な token で 401 を返す", async () => {
    const res = await app.request(
      "/api/data",
      { headers: { Authorization: "Bearer wrong-token" } },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("Bearer プレフィックスなしで token のみの場合 401 を返す", async () => {
    const res = await app.request(
      "/api/data",
      { headers: { Authorization: AUTH_TOKEN } },
      env,
    );
    expect(res.status).toBe(401);
  });
});
