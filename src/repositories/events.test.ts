import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type {
	ParsedApiError,
	ParsedApiRequest,
	ParsedToolResult,
} from "../types/domain";
import {
	insertApiErrors,
	insertApiRequests,
	insertToolResults,
} from "./events";

function makeApiRequest(
	overrides?: Partial<ParsedApiRequest>,
): ParsedApiRequest {
	return {
		sessionId: "session-1",
		eventSequence: 1,
		timestampNs: "1700000000000000000",
		timestampMs: 1700000000000,
		model: "claude-sonnet-4-5-20250929",
		costUsd: 0.01,
		durationMs: 1500,
		inputTokens: 100,
		outputTokens: 200,
		cacheReadTokens: 50,
		cacheCreationTokens: 10,
		...overrides,
	};
}

function makeToolResult(
	overrides?: Partial<ParsedToolResult>,
): ParsedToolResult {
	return {
		sessionId: "session-1",
		eventSequence: 2,
		timestampNs: "1700000001000000000",
		timestampMs: 1700000001000,
		toolName: "Read",
		success: true,
		durationMs: 50,
		error: null,
		decision: "accept",
		source: "config",
		...overrides,
	};
}

function makeApiError(overrides?: Partial<ParsedApiError>): ParsedApiError {
	return {
		sessionId: "session-1",
		eventSequence: 3,
		timestampNs: "1700000002000000000",
		timestampMs: 1700000002000,
		model: "claude-sonnet-4-5-20250929",
		error: "Rate limit exceeded",
		statusCode: 429,
		durationMs: 100,
		attempt: 1,
		...overrides,
	};
}

describe("insertApiRequests", () => {
	it("1件の ParsedApiRequest を挿入し全カラムの値が一致する", async () => {
		const request = makeApiRequest();
		await insertApiRequests(env.DB, [request]);

		const row = await env.DB.prepare(
			"SELECT * FROM api_requests WHERE session_id = ?",
		)
			.bind("session-1")
			.first();

		expect(row).not.toBeNull();
		expect(row?.session_id).toBe("session-1");
		expect(row?.event_sequence).toBe(1);
		expect(row?.timestamp_ns).toBe("1700000000000000000");
		expect(row?.timestamp_ms).toBe(1700000000000);
		expect(row?.model).toBe("claude-sonnet-4-5-20250929");
		expect(row?.cost_usd).toBe(0.01);
		expect(row?.duration_ms).toBe(1500);
		expect(row?.input_tokens).toBe(100);
		expect(row?.output_tokens).toBe(200);
		expect(row?.cache_read_tokens).toBe(50);
		expect(row?.cache_creation_tokens).toBe(10);
	});

	it("複数件をバッチ挿入する", async () => {
		const requests = [
			makeApiRequest({ sessionId: "batch-1", eventSequence: 1 }),
			makeApiRequest({ sessionId: "batch-1", eventSequence: 2, costUsd: 0.02 }),
			makeApiRequest({ sessionId: "batch-1", eventSequence: 3, costUsd: 0.03 }),
		];
		await insertApiRequests(env.DB, requests);

		const result = await env.DB.prepare(
			"SELECT COUNT(*) as count FROM api_requests WHERE session_id = ?",
		)
			.bind("batch-1")
			.first();
		expect(result?.count).toBe(3);
	});

	it("空配列を渡すと DB 操作を行わず正常終了する", async () => {
		await expect(insertApiRequests(env.DB, [])).resolves.toBeUndefined();
	});
});

describe("insertToolResults", () => {
	it("1件の ParsedToolResult を挿入する", async () => {
		const result = makeToolResult();
		await insertToolResults(env.DB, [result]);

		const row = await env.DB.prepare(
			"SELECT * FROM tool_results WHERE session_id = ?",
		)
			.bind("session-1")
			.first();

		expect(row).not.toBeNull();
		expect(row?.tool_name).toBe("Read");
		expect(row?.success).toBe(1);
		expect(row?.duration_ms).toBe(50);
		expect(row?.error).toBeNull();
		expect(row?.decision).toBe("accept");
		expect(row?.source).toBe("config");
	});

	it("空配列を渡すと正常終了する", async () => {
		await expect(insertToolResults(env.DB, [])).resolves.toBeUndefined();
	});
});

describe("insertApiErrors", () => {
	it("1件の ParsedApiError を挿入する", async () => {
		const error = makeApiError();
		await insertApiErrors(env.DB, [error]);

		const row = await env.DB.prepare(
			"SELECT * FROM api_errors WHERE session_id = ?",
		)
			.bind("session-1")
			.first();

		expect(row).not.toBeNull();
		expect(row?.model).toBe("claude-sonnet-4-5-20250929");
		expect(row?.error).toBe("Rate limit exceeded");
		expect(row?.status_code).toBe(429);
		expect(row?.duration_ms).toBe(100);
		expect(row?.attempt).toBe(1);
	});

	it("空配列を渡すと正常終了する", async () => {
		await expect(insertApiErrors(env.DB, [])).resolves.toBeUndefined();
	});
});
