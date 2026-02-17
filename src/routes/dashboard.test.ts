import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../index";

describe("GET /", () => {
	it("認証なしで 200 を返す", async () => {
		const res = await app.request("/", { method: "GET" }, env);
		expect(res.status).toBe(200);
	});

	it("Content-Type が text/html を含む", async () => {
		const res = await app.request("/", { method: "GET" }, env);
		expect(res.headers.get("Content-Type")).toContain("text/html");
	});
});

describe("GET /session/:id", () => {
	it("存在しないセッション ID で 404 を返す", async () => {
		const res = await app.request(
			"/session/nonexistent",
			{ method: "GET" },
			env,
		);
		expect(res.status).toBe(404);
	});
});
