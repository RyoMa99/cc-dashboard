import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../index";
import type {
	ExportLogsServiceRequest,
	ExportMetricsServiceRequest,
} from "../types/otlp";

const AUTH_TOKEN = env.AUTH_TOKEN;

function authHeaders(token = AUTH_TOKEN) {
	return {
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
	};
}

describe("POST /v1/logs", () => {
	it("有効な token + api_request ペイロードで 200 を返しデータが保存される", async () => {
		const payload: ExportLogsServiceRequest = {
			resourceLogs: [
				{
					resource: {
						attributes: [
							{ key: "session.id", value: { stringValue: "otlp-test-s1" } },
						],
					},
					scopeLogs: [
						{
							logRecords: [
								{
									timeUnixNano: "1700000000000000000",
									attributes: [
										{
											key: "event.name",
											value: { stringValue: "api_request" },
										},
										{
											key: "model",
											value: { stringValue: "claude-sonnet-4-5-20250929" },
										},
										{ key: "cost_usd", value: { doubleValue: 0.005 } },
										{ key: "input_tokens", value: { intValue: 150 } },
										{ key: "output_tokens", value: { intValue: 75 } },
									],
								},
							],
						},
					],
				},
			],
		};

		const res = await app.request(
			"/v1/logs",
			{ method: "POST", headers: authHeaders(), body: JSON.stringify(payload) },
			env,
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ partialSuccess: {} });

		// DB に保存されたか確認
		const row = await env.DB.prepare(
			"SELECT * FROM api_requests WHERE session_id = ?",
		)
			.bind("otlp-test-s1")
			.first();
		expect(row).not.toBeNull();
		expect(row?.model).toBe("claude-sonnet-4-5-20250929");
		expect(row?.cost_usd).toBe(0.005);
	});

	it("有効な token + 空の logRecords で 200 を返しテーブルに挿入なし", async () => {
		const payload: ExportLogsServiceRequest = {
			resourceLogs: [{ scopeLogs: [{ logRecords: [] }] }],
		};

		const beforeCount = await env.DB.prepare(
			"SELECT COUNT(*) as count FROM api_requests WHERE session_id = ?",
		)
			.bind("should-not-exist")
			.first();

		const res = await app.request(
			"/v1/logs",
			{ method: "POST", headers: authHeaders(), body: JSON.stringify(payload) },
			env,
		);

		expect(res.status).toBe(200);

		const afterCount = await env.DB.prepare(
			"SELECT COUNT(*) as count FROM api_requests WHERE session_id = ?",
		)
			.bind("should-not-exist")
			.first();
		expect(afterCount?.count).toBe(beforeCount?.count);
	});

	it("無効な Bearer token で 401 を返す", async () => {
		const res = await app.request(
			"/v1/logs",
			{
				method: "POST",
				headers: authHeaders("wrong-token"),
				body: JSON.stringify({ resourceLogs: [] }),
			},
			env,
		);
		expect(res.status).toBe(401);
	});

	it("Authorization ヘッダーなしで 401 を返す", async () => {
		const res = await app.request(
			"/v1/logs",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ resourceLogs: [] }),
			},
			env,
		);
		expect(res.status).toBe(401);
	});
});

describe("POST /v1/metrics", () => {
	it("有効な token + メトリクスペイロードで 200 を返しデータが保存される", async () => {
		const payload: ExportMetricsServiceRequest = {
			resourceMetrics: [
				{
					resource: {
						attributes: [
							{ key: "session.id", value: { stringValue: "otlp-metric-s1" } },
						],
					},
					scopeMetrics: [
						{
							metrics: [
								{
									name: "token_usage",
									sum: {
										dataPoints: [
											{
												timeUnixNano: "1700000000000000000",
												asInt: 500,
												attributes: [
													{ key: "type", value: { stringValue: "input" } },
												],
											},
										],
									},
								},
							],
						},
					],
				},
			],
		};

		const res = await app.request(
			"/v1/metrics",
			{ method: "POST", headers: authHeaders(), body: JSON.stringify(payload) },
			env,
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ partialSuccess: {} });

		// DB に保存されたか確認
		const row = await env.DB.prepare(
			"SELECT * FROM metric_data_points WHERE session_id = ?",
		)
			.bind("otlp-metric-s1")
			.first();
		expect(row).not.toBeNull();
		expect(row?.metric_name).toBe("token_usage");
		expect(row?.value).toBe(500);
	});

	it("無効な Bearer token で 401 を返す", async () => {
		const res = await app.request(
			"/v1/metrics",
			{
				method: "POST",
				headers: authHeaders("wrong-token"),
				body: JSON.stringify({ resourceMetrics: [] }),
			},
			env,
		);
		expect(res.status).toBe(401);
	});
});
