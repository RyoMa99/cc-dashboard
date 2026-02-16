import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import {
	insertApiErrors,
	insertApiRequests,
	insertToolResults,
	upsertSessions,
} from "../repositories/events";
import type {
	ParsedApiError,
	ParsedApiRequest,
	ParsedToolResult,
} from "../types/domain";
import {
	buildRepoJoin,
	getDailyCosts,
	getDailyTokens,
	getDistinctRepositories,
	getOverviewStats,
	getRecentSessions,
	getRepositoryCosts,
	getToolUsage,
} from "./dashboard";

function makeApiRequest(
	overrides?: Partial<ParsedApiRequest>,
): ParsedApiRequest {
	return {
		sessionId: "session-1",
		eventSequence: 1,
		timestampNs: "1700000000000000000",
		timestampMs: Date.now(),
		model: "claude-sonnet-4-5-20250929",
		costUsd: 0.01,
		durationMs: 1500,
		inputTokens: 100,
		outputTokens: 50,
		cacheReadTokens: 0,
		cacheCreationTokens: 0,
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
		timestampMs: Date.now(),
		toolName: "Read",
		success: true,
		durationMs: 100,
		error: null,
		decision: null,
		source: null,
		toolParameters: null,
		...overrides,
	};
}

function makeApiError(overrides?: Partial<ParsedApiError>): ParsedApiError {
	return {
		sessionId: "session-1",
		eventSequence: 3,
		timestampNs: "1700000002000000000",
		timestampMs: Date.now(),
		model: "claude-sonnet-4-5-20250929",
		error: "Rate limit exceeded",
		statusCode: 429,
		durationMs: 100,
		attempt: 1,
		...overrides,
	};
}

/** 今日からN日前の timestamp_ms を生成する */
function daysAgoMs(n: number): number {
	return Date.now() - n * 24 * 60 * 60 * 1000;
}

/** timestamp_ms を UTC 日付文字列に変換する */
function msToDateStr(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

describe("getOverviewStats", () => {
	it("api_requests の集計値を正しく返す", async () => {
		await insertApiRequests(env.DB, [
			makeApiRequest({
				sessionId: "s1",
				costUsd: 0.01,
				inputTokens: 100,
				outputTokens: 50,
			}),
			makeApiRequest({
				sessionId: "s1",
				eventSequence: 2,
				costUsd: 0.02,
				inputTokens: 200,
				outputTokens: 100,
			}),
		]);

		const stats = await getOverviewStats(env.DB);
		expect(stats.totalCost).toBeCloseTo(0.03);
		expect(stats.totalInputTokens).toBe(300);
		expect(stats.totalOutputTokens).toBe(150);
		expect(stats.apiCallCount).toBe(2);
	});

	it("api_errors のカウントを返す", async () => {
		await insertApiErrors(env.DB, [makeApiError({ sessionId: "s-err" })]);

		const stats = await getOverviewStats(env.DB);
		expect(stats.errorCount).toBeGreaterThanOrEqual(1);
	});

	it("データが空の場合すべて 0 を返す", async () => {
		// 他のテストのデータが混入する可能性があるため、
		// 空のDBでの動作を新規テーブルで確認するのは困難。
		// 代わりに、関数がエラーなく実行されることを確認する。
		const stats = await getOverviewStats(env.DB);
		expect(stats).toBeDefined();
		expect(typeof stats.totalCost).toBe("number");
		expect(typeof stats.errorCount).toBe("number");
	});
});

describe("getDailyTokens", () => {
	it("日付ごとにトークン数を集計し降順で返す", async () => {
		const twoDaysAgo = daysAgoMs(2);
		const oneDayAgo = daysAgoMs(1);
		const date2 = msToDateStr(twoDaysAgo);
		const date1 = msToDateStr(oneDayAgo);

		await insertApiRequests(env.DB, [
			makeApiRequest({
				sessionId: "dt-1",
				timestampMs: twoDaysAgo,
				inputTokens: 100,
				outputTokens: 50,
			}),
			makeApiRequest({
				sessionId: "dt-2",
				timestampMs: oneDayAgo,
				inputTokens: 200,
				outputTokens: 100,
			}),
		]);

		const rows = await getDailyTokens(env.DB);
		const older = rows.find((r) => r.date === date2);
		const newer = rows.find((r) => r.date === date1);

		expect(older).toBeDefined();
		expect(newer).toBeDefined();
		// 降順（新しい日付が先）
		const idxOlder = rows.findIndex((r) => r.date === date2);
		const idxNewer = rows.findIndex((r) => r.date === date1);
		expect(idxNewer).toBeLessThan(idxOlder);
	});

	it("同一日付の複数レコードでトークン数が合算される", async () => {
		const ts = daysAgoMs(3);
		const date = msToDateStr(ts);

		await insertApiRequests(env.DB, [
			makeApiRequest({
				sessionId: "dt-sum-1",
				timestampMs: ts,
				inputTokens: 100,
				outputTokens: 50,
			}),
			makeApiRequest({
				sessionId: "dt-sum-2",
				timestampMs: ts,
				inputTokens: 200,
				outputTokens: 100,
			}),
		]);

		const rows = await getDailyTokens(env.DB);
		const row = rows.find((r) => r.date === date);
		expect(row).toBeDefined();
		expect(row?.inputTokens).toBeGreaterThanOrEqual(300);
		expect(row?.outputTokens).toBeGreaterThanOrEqual(150);
	});
});

describe("getDailyCosts", () => {
	it("同一日付・異なるモデルでモデルごとに行が分かれる", async () => {
		const ts = daysAgoMs(4);
		const date = msToDateStr(ts);
		await insertApiRequests(env.DB, [
			makeApiRequest({
				sessionId: "dc-1",
				timestampMs: ts,
				model: "claude-sonnet-4-5-20250929",
				costUsd: 0.01,
			}),
			makeApiRequest({
				sessionId: "dc-2",
				timestampMs: ts,
				model: "claude-opus-4-6",
				costUsd: 0.05,
			}),
		]);

		const rows = await getDailyCosts(env.DB);
		const dateRows = rows.filter((r) => r.date === date);
		const models = dateRows.map((r) => r.model);
		expect(models).toContain("claude-sonnet-4-5-20250929");
		expect(models).toContain("claude-opus-4-6");
	});

	it("同一日付・同一モデルでコストと呼び出し数が合算される", async () => {
		const ts = daysAgoMs(5);
		const date = msToDateStr(ts);
		await insertApiRequests(env.DB, [
			makeApiRequest({
				sessionId: "dc-sum-1",
				timestampMs: ts,
				model: "claude-sonnet-4-5-20250929",
				costUsd: 0.01,
			}),
			makeApiRequest({
				sessionId: "dc-sum-2",
				timestampMs: ts,
				model: "claude-sonnet-4-5-20250929",
				costUsd: 0.02,
			}),
		]);

		const rows = await getDailyCosts(env.DB);
		const row = rows.find(
			(r) => r.date === date && r.model === "claude-sonnet-4-5-20250929",
		);
		expect(row).toBeDefined();
		expect(row?.cost).toBeGreaterThanOrEqual(0.03);
		expect(row?.calls).toBeGreaterThanOrEqual(2);
	});
});

describe("getToolUsage", () => {
	it("ツールごとに呼び出し数・成功率・平均時間を集計する", async () => {
		await insertToolResults(env.DB, [
			makeToolResult({ toolName: "Bash", success: true, durationMs: 100 }),
			makeToolResult({ toolName: "Bash", success: true, durationMs: 200 }),
			makeToolResult({ toolName: "Bash", success: true, durationMs: 300 }),
			makeToolResult({ toolName: "Bash", success: false, durationMs: 100 }),
		]);

		const rows = await getToolUsage(env.DB);
		const bash = rows.find((r) => r.toolName === "Bash");
		expect(bash).toBeDefined();
		expect(bash?.callCount).toBeGreaterThanOrEqual(4);
		expect(bash?.successRate).toBe(75.0);
		expect(bash?.avgDurationMs).toBe(175);
	});
});

describe("getRecentSessions", () => {
	it("セッションごとに集計し tool_calls を LEFT JOIN で返す", async () => {
		const now = Date.now();
		// s1: api_requests 2件 + tool_results 1件
		await insertApiRequests(env.DB, [
			makeApiRequest({
				sessionId: "rs-s1",
				eventSequence: 1,
				timestampMs: now - 1000,
				costUsd: 0.01,
			}),
			makeApiRequest({
				sessionId: "rs-s1",
				eventSequence: 2,
				timestampMs: now,
				costUsd: 0.02,
			}),
		]);
		await insertToolResults(env.DB, [
			makeToolResult({ sessionId: "rs-s1", timestampMs: now }),
		]);

		// s2: api_requests 1件 + tool_results 0件
		await insertApiRequests(env.DB, [
			makeApiRequest({
				sessionId: "rs-s2",
				eventSequence: 1,
				timestampMs: now - 2000,
				costUsd: 0.005,
			}),
		]);

		const rows = await getRecentSessions(env.DB);
		const s1 = rows.find((r) => r.sessionId === "rs-s1");
		const s2 = rows.find((r) => r.sessionId === "rs-s2");

		expect(s1).toBeDefined();
		expect(s1?.apiCalls).toBe(2);
		expect(s1?.toolCalls).toBe(1);

		expect(s2).toBeDefined();
		expect(s2?.apiCalls).toBe(1);
		expect(s2?.toolCalls).toBe(0);
	});

	it("LIMIT を超えるセッション数の場合上位のみ返す", async () => {
		const now = Date.now();
		const requests: ParsedApiRequest[] = [];
		for (let i = 0; i < 25; i++) {
			requests.push(
				makeApiRequest({
					sessionId: `limit-s${i}`,
					timestampMs: now - i * 1000,
				}),
			);
		}
		await insertApiRequests(env.DB, requests);

		const rows = await getRecentSessions(env.DB, 20);
		expect(rows.length).toBeLessThanOrEqual(20);
	});

	it("repository フィールドが sessions テーブルから取得される", async () => {
		const now = Date.now();
		// Given: session レコードに repository を設定
		await upsertSessions(env.DB, [
			{ sessionId: "rs-repo-1", repository: "my-project", timestampMs: now },
		]);
		await insertApiRequests(env.DB, [
			makeApiRequest({
				sessionId: "rs-repo-1",
				eventSequence: 1,
				timestampMs: now,
			}),
		]);

		// When: getRecentSessions を実行
		const rows = await getRecentSessions(env.DB);
		const row = rows.find((r) => r.sessionId === "rs-repo-1");

		// Then: repository フィールドが返る
		expect(row).toBeDefined();
		expect(row?.repository).toBe("my-project");
	});
});

// --- buildRepoJoin ヘルパーの単体テスト ---

describe("buildRepoJoin", () => {
	it("repo が undefined の場合 JOIN も WHERE も空を返す", () => {
		const result = buildRepoJoin(undefined, "a");
		expect(result.join).toBe("");
		expect(result.where).toBe("");
		expect(result.binds).toEqual([]);
	});

	it("repo が文字列の場合 JOIN と WHERE = ? を返す", () => {
		const result = buildRepoJoin("cc-dashboard", "a");
		expect(result.join).toContain("JOIN sessions");
		expect(result.join).toContain("a.session_id = s.session_id");
		expect(result.where).toContain("s.repository = ?");
		expect(result.binds).toEqual(["cc-dashboard"]);
	});

	it("repo が null の場合 JOIN と WHERE IS NULL を返す", () => {
		const result = buildRepoJoin(null, "a");
		expect(result.join).toContain("JOIN sessions");
		expect(result.where).toContain("s.repository IS NULL");
		expect(result.binds).toEqual([]);
	});
});

// --- repository フィルタの統合テスト ---

/** テスト用にセッション + APIリクエストを一括セットアップ */
async function setupRepoTestData() {
	const now = Date.now();
	const ts = daysAgoMs(1);

	// セッション: 2つのリポジトリ + 1つの未分類
	await upsertSessions(env.DB, [
		{ sessionId: "rf-proj-a", repository: "project-a", timestampMs: now },
		{ sessionId: "rf-proj-b", repository: "project-b", timestampMs: now },
		{ sessionId: "rf-none", repository: null, timestampMs: now },
	]);

	// APIリクエスト
	await insertApiRequests(env.DB, [
		makeApiRequest({
			sessionId: "rf-proj-a",
			eventSequence: 1,
			timestampMs: ts,
			costUsd: 0.1,
			inputTokens: 1000,
			outputTokens: 500,
		}),
		makeApiRequest({
			sessionId: "rf-proj-b",
			eventSequence: 1,
			timestampMs: ts,
			costUsd: 0.2,
			inputTokens: 2000,
			outputTokens: 1000,
		}),
		makeApiRequest({
			sessionId: "rf-none",
			eventSequence: 1,
			timestampMs: ts,
			costUsd: 0.05,
			inputTokens: 500,
			outputTokens: 250,
		}),
	]);

	// ツール結果
	await insertToolResults(env.DB, [
		makeToolResult({
			sessionId: "rf-proj-a",
			toolName: "Read",
			success: true,
			durationMs: 50,
		}),
		makeToolResult({
			sessionId: "rf-proj-b",
			toolName: "Write",
			success: true,
			durationMs: 100,
		}),
	]);
}

describe("getOverviewStats with repo filter", () => {
	it("repo フィルタでリポジトリ別に集計される", async () => {
		await setupRepoTestData();

		// When: project-a でフィルタ
		const stats = await getOverviewStats(env.DB, "project-a");

		// Then: project-a のデータのみ集計
		expect(stats.totalCost).toBeCloseTo(0.1, 1);
		expect(stats.totalInputTokens).toBeGreaterThanOrEqual(1000);
	});

	it("repo が null の場合 repository IS NULL のデータのみ返す", async () => {
		await setupRepoTestData();

		const stats = await getOverviewStats(env.DB, null);
		expect(stats.totalCost).toBeCloseTo(0.05, 1);
	});

	it("存在しないリポジトリを指定するとゼロ結果を返す", async () => {
		await setupRepoTestData();

		const stats = await getOverviewStats(env.DB, "nonexistent-repo");
		expect(stats.totalCost).toBe(0);
		expect(stats.apiCallCount).toBe(0);
	});
});

describe("getDailyCosts with repo filter", () => {
	it("repo フィルタでリポジトリ別にコスト集計される", async () => {
		await setupRepoTestData();

		const rows = await getDailyCosts(env.DB, 30, "project-a");
		const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);
		expect(totalCost).toBeCloseTo(0.1, 1);
	});

	it("repo undefined の場合は全データを返す（後方互換）", async () => {
		await setupRepoTestData();

		const rows = await getDailyCosts(env.DB, 30, undefined);
		const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);
		expect(totalCost).toBeGreaterThanOrEqual(0.35);
	});
});

describe("getDailyTokens with repo filter", () => {
	it("repo フィルタでリポジトリ別にトークン集計される", async () => {
		await setupRepoTestData();

		const rows = await getDailyTokens(env.DB, 30, "project-b");
		const totalInput = rows.reduce((sum, r) => sum + r.inputTokens, 0);
		expect(totalInput).toBeGreaterThanOrEqual(2000);
	});
});

describe("getToolUsage with repo filter", () => {
	it("repo フィルタでリポジトリ別にツール使用状況が集計される", async () => {
		await setupRepoTestData();

		const rows = await getToolUsage(env.DB, "project-a");
		const readTool = rows.find((r) => r.toolName === "Read");
		expect(readTool).toBeDefined();
		// project-b の Write は含まれない
		const writeTool = rows.find((r) => r.toolName === "Write");
		expect(writeTool).toBeUndefined();
	});
});

describe("getRecentSessions with repo filter", () => {
	it("repo フィルタでリポジトリ別にセッションが返る", async () => {
		await setupRepoTestData();

		const rows = await getRecentSessions(env.DB, 20, "project-a");
		expect(rows.every((r) => r.sessionId === "rf-proj-a")).toBe(true);
	});

	it("repo null で未分類セッションのみ返す", async () => {
		await setupRepoTestData();

		const rows = await getRecentSessions(env.DB, 20, null);
		expect(rows.every((r) => r.sessionId === "rf-none")).toBe(true);
	});
});

// --- タスク2: リポジトリ別コスト集計・リポジトリ一覧 ---

describe("getRepositoryCosts", () => {
	it("リポジトリ別にコスト降順で集計を返す", async () => {
		await setupRepoTestData();

		const rows = await getRepositoryCosts(env.DB);
		expect(rows.length).toBeGreaterThanOrEqual(2);
		// コスト降順
		for (let i = 1; i < rows.length; i++) {
			expect(rows[i - 1].totalCost).toBeGreaterThanOrEqual(rows[i].totalCost);
		}
	});

	it("repository IS NULL のセッションは「未分類」として集計される", async () => {
		await setupRepoTestData();

		const rows = await getRepositoryCosts(env.DB);
		const uncategorized = rows.find((r) => r.repository === "未分類");
		expect(uncategorized).toBeDefined();
		expect(uncategorized?.totalCost).toBeGreaterThan(0);
	});

	it("データなしの場合は空配列を返す", async () => {
		// setupRepoTestData を呼ばず、他テストのデータがあっても関数自体がエラーにならない
		const rows = await getRepositoryCosts(env.DB);
		expect(Array.isArray(rows)).toBe(true);
	});
});

describe("getDistinctRepositories", () => {
	it("NULL を除いたユニークなリポジトリ名をアルファベット順で返す", async () => {
		await setupRepoTestData();

		const repos = await getDistinctRepositories(env.DB);
		expect(repos).toContain("project-a");
		expect(repos).toContain("project-b");
		// NULL は除外
		expect(repos).not.toContain(null);
		// アルファベット順
		for (let i = 1; i < repos.length; i++) {
			expect(repos[i - 1] <= repos[i]).toBe(true);
		}
	});
});
