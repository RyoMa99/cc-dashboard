import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type {
	ParsedApiError,
	ParsedApiRequest,
	ParsedToolDecision,
	ParsedToolResult,
	ParsedUserPrompt,
} from "../types/domain";
import {
	insertApiErrors,
	insertApiRequests,
	insertToolDecisions,
	insertToolResults,
	insertUserPrompts,
	type SessionUpsertData,
	upsertSessions,
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
		toolParameters: null,
		mcpServerName: null,
		mcpToolName: null,
		skillName: null,
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

function makeUserPrompt(
	overrides?: Partial<ParsedUserPrompt>,
): ParsedUserPrompt {
	return {
		sessionId: "session-1",
		eventSequence: 4,
		timestampNs: "1700000003000000000",
		timestampMs: 1700000003000,
		promptLength: 42,
		prompt: "Hello Claude",
		...overrides,
	};
}

function makeToolDecision(
	overrides?: Partial<ParsedToolDecision>,
): ParsedToolDecision {
	return {
		sessionId: "session-1",
		eventSequence: 5,
		timestampNs: "1700000004000000000",
		timestampMs: 1700000004000,
		toolName: "Bash",
		decision: "reject",
		source: "user",
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
		expect(row?.tool_parameters).toBeNull();
		expect(row?.mcp_server_name).toBeNull();
		expect(row?.mcp_tool_name).toBeNull();
		expect(row?.skill_name).toBeNull();
	});

	it("tool_parameters を格納する", async () => {
		const result = makeToolResult({
			sessionId: "session-tp",
			toolParameters: '{"command":"ls"}',
		});
		await insertToolResults(env.DB, [result]);

		const row = await env.DB.prepare(
			"SELECT tool_parameters FROM tool_results WHERE session_id = ?",
		)
			.bind("session-tp")
			.first();

		expect(row?.tool_parameters).toBe('{"command":"ls"}');
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

describe("insertUserPrompts", () => {
	it("1件の ParsedUserPrompt を挿入する", async () => {
		const prompt = makeUserPrompt({ sessionId: "session-up" });
		await insertUserPrompts(env.DB, [prompt]);

		const row = await env.DB.prepare(
			"SELECT * FROM user_prompts WHERE session_id = ?",
		)
			.bind("session-up")
			.first();

		expect(row).not.toBeNull();
		expect(row?.session_id).toBe("session-up");
		expect(row?.event_sequence).toBe(4);
		expect(row?.prompt_length).toBe(42);
		expect(row?.prompt).toBe("Hello Claude");
	});

	it("空配列を渡すと正常終了する", async () => {
		await expect(insertUserPrompts(env.DB, [])).resolves.toBeUndefined();
	});
});

describe("insertToolDecisions", () => {
	it("1件の ParsedToolDecision を挿入する", async () => {
		const decision = makeToolDecision({ sessionId: "session-td" });
		await insertToolDecisions(env.DB, [decision]);

		const row = await env.DB.prepare(
			"SELECT * FROM tool_decisions WHERE session_id = ?",
		)
			.bind("session-td")
			.first();

		expect(row).not.toBeNull();
		expect(row?.session_id).toBe("session-td");
		expect(row?.tool_name).toBe("Bash");
		expect(row?.decision).toBe("reject");
		expect(row?.source).toBe("user");
	});

	it("空配列を渡すと正常終了する", async () => {
		await expect(insertToolDecisions(env.DB, [])).resolves.toBeUndefined();
	});
});

describe("upsertSessions", () => {
	it("新規 session_id で first_event_at = last_event_at = timestampMs", async () => {
		const data: SessionUpsertData = {
			sessionId: "upsert-new",
			repository: "cc-dashboard",
			timestampMs: 1700000000000,
		};
		await upsertSessions(env.DB, [data]);

		const row = await env.DB.prepare(
			"SELECT * FROM sessions WHERE session_id = ?",
		)
			.bind("upsert-new")
			.first();

		expect(row).not.toBeNull();
		expect(row?.session_id).toBe("upsert-new");
		expect(row?.repository).toBe("cc-dashboard");
		expect(row?.first_event_at).toBe(1700000000000);
		expect(row?.last_event_at).toBe(1700000000000);
	});

	it("既存 session_id + 後のタイムスタンプで last_event_at が更新される", async () => {
		await upsertSessions(env.DB, [
			{ sessionId: "upsert-later", repository: "repo", timestampMs: 1000 },
		]);
		await upsertSessions(env.DB, [
			{ sessionId: "upsert-later", repository: "repo", timestampMs: 2000 },
		]);

		const row = await env.DB.prepare(
			"SELECT * FROM sessions WHERE session_id = ?",
		)
			.bind("upsert-later")
			.first();

		expect(row?.first_event_at).toBe(1000);
		expect(row?.last_event_at).toBe(2000);
	});

	it("既存 session_id + 前のタイムスタンプで first_event_at が更新される", async () => {
		await upsertSessions(env.DB, [
			{ sessionId: "upsert-earlier", repository: "repo", timestampMs: 2000 },
		]);
		await upsertSessions(env.DB, [
			{ sessionId: "upsert-earlier", repository: "repo", timestampMs: 500 },
		]);

		const row = await env.DB.prepare(
			"SELECT * FROM sessions WHERE session_id = ?",
		)
			.bind("upsert-earlier")
			.first();

		expect(row?.first_event_at).toBe(500);
		expect(row?.last_event_at).toBe(2000);
	});

	it("repository=null で既存 repository を保持する", async () => {
		await upsertSessions(env.DB, [
			{
				sessionId: "upsert-keep-repo",
				repository: "existing",
				timestampMs: 1000,
			},
		]);
		await upsertSessions(env.DB, [
			{ sessionId: "upsert-keep-repo", repository: null, timestampMs: 2000 },
		]);

		const row = await env.DB.prepare(
			"SELECT * FROM sessions WHERE session_id = ?",
		)
			.bind("upsert-keep-repo")
			.first();

		expect(row?.repository).toBe("existing");
	});

	it("既存 repository が null の場合に新しい repository で更新する", async () => {
		await upsertSessions(env.DB, [
			{ sessionId: "upsert-set-repo", repository: null, timestampMs: 1000 },
		]);
		await upsertSessions(env.DB, [
			{
				sessionId: "upsert-set-repo",
				repository: "new-repo",
				timestampMs: 2000,
			},
		]);

		const row = await env.DB.prepare(
			"SELECT * FROM sessions WHERE session_id = ?",
		)
			.bind("upsert-set-repo")
			.first();

		expect(row?.repository).toBe("new-repo");
	});

	it("空配列を渡すと正常終了する", async () => {
		await expect(upsertSessions(env.DB, [])).resolves.toBeUndefined();
	});
});
