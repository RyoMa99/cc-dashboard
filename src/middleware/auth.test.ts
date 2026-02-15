import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { Bindings } from "../types/env";
import { bearerAuth, dashboardAuth } from "./auth";

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

describe("dashboardAuth", () => {
	const app = createApp();
	app.use("/*", dashboardAuth);
	app.get("/", (c) => c.text("Dashboard"));

	const env = { AUTH_TOKEN } as Bindings;

	it("有効な Cookie 付きリクエストで 200 を返す", async () => {
		const res = await app.request(
			"/",
			{ headers: { Cookie: `cc_dashboard_session=${AUTH_TOKEN}` } },
			env,
		);
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("Dashboard");
	});

	it("Cookie なし + 有効な token パラメータで Set-Cookie 付き 302 リダイレクトを返す", async () => {
		const res = await app.request(`/?token=${AUTH_TOKEN}`, {}, env);
		expect(res.status).toBe(302);

		const setCookie = res.headers.get("Set-Cookie");
		expect(setCookie).toContain("cc_dashboard_session=");
		expect(setCookie).toContain("HttpOnly");
		expect(setCookie).toContain("Secure");
	});

	it("リダイレクト先 URL に token パラメータが含まれない", async () => {
		const res = await app.request(`/?token=${AUTH_TOKEN}`, {}, env);
		const location = res.headers.get("Location");
		expect(location).not.toContain("token=");
		expect(location).toBe("/");
	});

	it("Cookie なし + token パラメータなしで 401 を返す", async () => {
		const res = await app.request("/", {}, env);
		expect(res.status).toBe(401);
	});

	it("Cookie なし + 無効な token パラメータで 401 を返す", async () => {
		const res = await app.request("/?token=wrong-token", {}, env);
		expect(res.status).toBe(401);
	});
});
