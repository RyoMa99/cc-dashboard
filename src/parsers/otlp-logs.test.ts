import { describe, expect, it } from "vitest";
import type { ExportLogsServiceRequest, KeyValue } from "../types/otlp";
import { parseLogsPayload } from "./otlp-logs";

function makeLogPayload(
	eventName: string,
	attrs: KeyValue[],
	sessionId = "test-session-123",
): ExportLogsServiceRequest {
	return {
		resourceLogs: [
			{
				resource: {
					attributes: [
						{
							key: "session.id",
							value: { stringValue: sessionId },
						},
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
										value: { stringValue: eventName },
									},
									...attrs,
								],
							},
						],
					},
				],
			},
		],
	};
}

describe("parseLogsPayload", () => {
	describe("api_request イベント", () => {
		it("すべてのフィールドを正しくパースする", () => {
			const payload = makeLogPayload("api_request", [
				{ key: "model", value: { stringValue: "claude-sonnet-4-5-20250929" } },
				{ key: "cost_usd", value: { doubleValue: 0.003 } },
				{ key: "duration_ms", value: { intValue: 1500 } },
				{ key: "input_tokens", value: { intValue: 100 } },
				{ key: "output_tokens", value: { intValue: 200 } },
				{ key: "cache_read_tokens", value: { intValue: 50 } },
				{ key: "cache_creation_tokens", value: { intValue: 10 } },
				{ key: "event.sequence", value: { intValue: 1 } },
			]);

			const events = parseLogsPayload(payload);
			expect(events).toHaveLength(1);
			expect(events[0].type).toBe("api_request");

			if (events[0].type !== "api_request") throw new Error("unreachable");
			const data = events[0].data;
			expect(data.sessionId).toBe("test-session-123");
			expect(data.model).toBe("claude-sonnet-4-5-20250929");
			expect(data.costUsd).toBe(0.003);
			expect(data.durationMs).toBe(1500);
			expect(data.inputTokens).toBe(100);
			expect(data.outputTokens).toBe(200);
			expect(data.cacheReadTokens).toBe(50);
			expect(data.cacheCreationTokens).toBe(10);
			expect(data.eventSequence).toBe(1);
			expect(data.timestampMs).toBe(1700000000000);
		});

		it("intValue が文字列でもパースできる", () => {
			const payload = makeLogPayload("api_request", [
				{ key: "model", value: { stringValue: "claude-opus-4-6" } },
				{ key: "input_tokens", value: { intValue: "500" } },
				{ key: "duration_ms", value: { intValue: "2000" } },
			]);

			const events = parseLogsPayload(payload);
			if (events[0].type !== "api_request") throw new Error("unreachable");
			expect(events[0].data.inputTokens).toBe(500);
			expect(events[0].data.durationMs).toBe(2000);
		});
	});

	describe("tool_result イベント", () => {
		it("成功ケースをパースする", () => {
			const payload = makeLogPayload("tool_result", [
				{ key: "tool_name", value: { stringValue: "Read" } },
				{ key: "success", value: { stringValue: "true" } },
				{ key: "duration_ms", value: { intValue: 50 } },
				{ key: "decision", value: { stringValue: "accept" } },
				{ key: "source", value: { stringValue: "config" } },
			]);

			const events = parseLogsPayload(payload);
			expect(events).toHaveLength(1);
			if (events[0].type !== "tool_result") throw new Error("unreachable");
			const data = events[0].data;
			expect(data.toolName).toBe("Read");
			expect(data.success).toBe(true);
			expect(data.durationMs).toBe(50);
			expect(data.decision).toBe("accept");
			expect(data.source).toBe("config");
			expect(data.error).toBeNull();
		});

		it("失敗ケースをパースする", () => {
			const payload = makeLogPayload("tool_result", [
				{ key: "tool_name", value: { stringValue: "Bash" } },
				{ key: "success", value: { stringValue: "false" } },
				{ key: "error", value: { stringValue: "Command failed" } },
			]);

			const events = parseLogsPayload(payload);
			if (events[0].type !== "tool_result") throw new Error("unreachable");
			expect(events[0].data.success).toBe(false);
			expect(events[0].data.error).toBe("Command failed");
		});
	});

	describe("api_error イベント", () => {
		it("エラー情報をパースする", () => {
			const payload = makeLogPayload("api_error", [
				{ key: "model", value: { stringValue: "claude-sonnet-4-5-20250929" } },
				{ key: "error", value: { stringValue: "Rate limit exceeded" } },
				{ key: "status_code", value: { intValue: 429 } },
				{ key: "duration_ms", value: { intValue: 100 } },
				{ key: "attempt", value: { intValue: 3 } },
			]);

			const events = parseLogsPayload(payload);
			if (events[0].type !== "api_error") throw new Error("unreachable");
			const data = events[0].data;
			expect(data.model).toBe("claude-sonnet-4-5-20250929");
			expect(data.error).toBe("Rate limit exceeded");
			expect(data.statusCode).toBe(429);
			expect(data.durationMs).toBe(100);
			expect(data.attempt).toBe(3);
		});
	});

	describe("エッジケース", () => {
		it("空のペイロードは空配列を返す", () => {
			expect(parseLogsPayload({})).toEqual([]);
			expect(parseLogsPayload({ resourceLogs: [] })).toEqual([]);
		});

		it("event.name がないレコードはスキップする", () => {
			const payload: ExportLogsServiceRequest = {
				resourceLogs: [
					{
						scopeLogs: [
							{
								logRecords: [
									{
										timeUnixNano: "1700000000000000000",
										attributes: [
											{ key: "some_key", value: { stringValue: "value" } },
										],
									},
								],
							},
						],
					},
				],
			};
			expect(parseLogsPayload(payload)).toEqual([]);
		});

		it("未知の event.name は unknown として返す", () => {
			const payload = makeLogPayload("user_prompt", []);
			const events = parseLogsPayload(payload);
			expect(events).toHaveLength(1);
			expect(events[0].type).toBe("unknown");
			if (events[0].type !== "unknown") throw new Error("unreachable");
			expect(events[0].eventName).toBe("user_prompt");
		});

		it("複数レコードをまとめてパースする", () => {
			const payload: ExportLogsServiceRequest = {
				resourceLogs: [
					{
						resource: {
							attributes: [{ key: "session.id", value: { stringValue: "s1" } }],
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
										],
									},
									{
										timeUnixNano: "1700000001000000000",
										attributes: [
											{
												key: "event.name",
												value: { stringValue: "tool_result" },
											},
											{
												key: "tool_name",
												value: { stringValue: "Edit" },
											},
										],
									},
								],
							},
						],
					},
				],
			};

			const events = parseLogsPayload(payload);
			expect(events).toHaveLength(2);
			expect(events[0].type).toBe("api_request");
			expect(events[1].type).toBe("tool_result");
		});
	});
});
