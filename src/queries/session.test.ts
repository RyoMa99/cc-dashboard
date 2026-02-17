import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import {
	insertApiErrors,
	insertApiRequests,
	insertToolDecisions,
	insertToolResults,
	insertUserPrompts,
	upsertSessions,
} from "../repositories/events";
import type {
	ParsedApiError,
	ParsedApiRequest,
	ParsedToolDecision,
	ParsedToolResult,
	ParsedUserPrompt,
} from "../types/domain";
import { getSessionInfo, getSessionTimeline } from "./session";

const now = Date.now();

function makeApiRequest(
	overrides?: Partial<ParsedApiRequest>,
): ParsedApiRequest {
	return {
		sessionId: "sess-timeline",
		eventSequence: 1,
		timestampNs: "1700000000000000000",
		timestampMs: now,
		model: "claude-sonnet-4-5-20250929",
		costUsd: 0.01,
		durationMs: 1500,
		inputTokens: 100,
		outputTokens: 50,
		cacheReadTokens: 10,
		cacheCreationTokens: 5,
		...overrides,
	};
}

function makeToolResult(
	overrides?: Partial<ParsedToolResult>,
): ParsedToolResult {
	return {
		sessionId: "sess-timeline",
		eventSequence: 2,
		timestampNs: "1700000001000000000",
		timestampMs: now + 1000,
		toolName: "Read",
		success: true,
		durationMs: 100,
		error: null,
		toolParameters: null,
		mcpServerName: null,
		mcpToolName: null,
		skillName: null,
		...overrides,
	};
}

function makeUserPrompt(
	overrides?: Partial<ParsedUserPrompt>,
): ParsedUserPrompt {
	return {
		sessionId: "sess-timeline",
		eventSequence: 3,
		timestampNs: "1700000002000000000",
		timestampMs: now + 2000,
		promptLength: 42,
		prompt: "Hello world",
		...overrides,
	};
}

function makeToolDecision(
	overrides?: Partial<ParsedToolDecision>,
): ParsedToolDecision {
	return {
		sessionId: "sess-timeline",
		eventSequence: 4,
		timestampNs: "1700000003000000000",
		timestampMs: now + 3000,
		toolName: "Bash",
		decision: "accept",
		source: "user",
		...overrides,
	};
}

function makeApiError(overrides?: Partial<ParsedApiError>): ParsedApiError {
	return {
		sessionId: "sess-timeline",
		eventSequence: 5,
		timestampNs: "1700000004000000000",
		timestampMs: now + 4000,
		model: "claude-sonnet-4-5-20250929",
		error: "Rate limit exceeded",
		statusCode: 429,
		durationMs: 100,
		attempt: 1,
		...overrides,
	};
}

describe("getSessionInfo", () => {
	it("存在する sessionId の情報を返す", async () => {
		await upsertSessions(env.DB, [
			{
				sessionId: "sess-info-1",
				repository: "owner/repo",
				timestampMs: now,
			},
		]);

		const info = await getSessionInfo(env.DB, "sess-info-1");
		expect(info).not.toBeNull();
		expect(info?.sessionId).toBe("sess-info-1");
		expect(info?.repository).toBe("owner/repo");
		expect(typeof info?.firstEventAt).toBe("number");
		expect(typeof info?.lastEventAt).toBe("number");
	});

	it("存在しない sessionId は null を返す", async () => {
		const info = await getSessionInfo(env.DB, "nonexistent-session");
		expect(info).toBeNull();
	});
});

describe("getSessionTimeline", () => {
	it("5テーブルすべてのイベントを event_sequence → timestamp_ms 順で返す", async () => {
		const sid = "sess-all-events";
		await Promise.all([
			insertApiRequests(env.DB, [
				makeApiRequest({ sessionId: sid, eventSequence: 1, timestampMs: now }),
			]),
			insertToolResults(env.DB, [
				makeToolResult({
					sessionId: sid,
					eventSequence: 2,
					timestampMs: now + 1000,
				}),
			]),
			insertUserPrompts(env.DB, [
				makeUserPrompt({
					sessionId: sid,
					eventSequence: 3,
					timestampMs: now + 2000,
				}),
			]),
			insertToolDecisions(env.DB, [
				makeToolDecision({
					sessionId: sid,
					eventSequence: 4,
					timestampMs: now + 3000,
				}),
			]),
			insertApiErrors(env.DB, [
				makeApiError({
					sessionId: sid,
					eventSequence: 5,
					timestampMs: now + 4000,
				}),
			]),
		]);

		const events = await getSessionTimeline(env.DB, sid);
		expect(events.length).toBe(5);

		// event_sequence 順
		const types = events.map((e) => e.type);
		expect(types).toEqual([
			"api_request",
			"tool_result",
			"user_prompt",
			"tool_decision",
			"api_error",
		]);
	});

	it("event_sequence が null のイベントは非 null の後に配置される", async () => {
		const sid = "sess-null-seq";
		await Promise.all([
			insertApiRequests(env.DB, [
				makeApiRequest({
					sessionId: sid,
					eventSequence: 1,
					timestampMs: now,
				}),
			]),
			insertToolResults(env.DB, [
				makeToolResult({
					sessionId: sid,
					eventSequence: null,
					timestampMs: now + 500,
				}),
			]),
		]);

		const events = await getSessionTimeline(env.DB, sid);
		expect(events.length).toBe(2);
		expect(events[0].type).toBe("api_request");
		expect(events[0].eventSequence).toBe(1);
		expect(events[1].type).toBe("tool_result");
		expect(events[1].eventSequence).toBeNull();
	});

	it("1テーブルのみにイベントがある場合そのイベントのみ返す", async () => {
		const sid = "sess-single-table";
		await insertUserPrompts(env.DB, [
			makeUserPrompt({ sessionId: sid, eventSequence: 1 }),
		]);

		const events = await getSessionTimeline(env.DB, sid);
		expect(events.length).toBe(1);
		expect(events[0].type).toBe("user_prompt");
	});

	it("イベントが0件の場合空配列を返す", async () => {
		const events = await getSessionTimeline(env.DB, "sess-no-events-at-all");
		expect(events).toEqual([]);
	});

	it("tool_result の success = 1 が boolean true に変換される", async () => {
		const sid = "sess-bool-check";
		await insertToolResults(env.DB, [
			makeToolResult({
				sessionId: sid,
				success: true,
				eventSequence: 1,
			}),
			makeToolResult({
				sessionId: sid,
				success: false,
				eventSequence: 2,
				timestampMs: now + 1000,
			}),
		]);

		const events = await getSessionTimeline(env.DB, sid);
		const toolEvents = events.filter((e) => e.type === "tool_result");
		expect(toolEvents.length).toBe(2);
		if (toolEvents[0].type === "tool_result") {
			expect(toolEvents[0].success).toBe(true);
		}
		if (toolEvents[1].type === "tool_result") {
			expect(toolEvents[1].success).toBe(false);
		}
	});
});
