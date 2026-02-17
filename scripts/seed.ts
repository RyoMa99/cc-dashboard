import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// --- Constants ---

const MODELS = {
	"claude-sonnet-4-5-20250929": {
		weight: 0.7,
		costRange: [0.003, 0.015] as const,
	},
	"claude-haiku-4-5-20251001": {
		weight: 0.2,
		costRange: [0.0005, 0.003] as const,
	},
	"claude-opus-4-6": { weight: 0.1, costRange: [0.01, 0.05] as const },
} as const;

const MODEL_NAMES = Object.keys(MODELS) as (keyof typeof MODELS)[];

const REPOSITORIES = [
	{ name: "cc-dashboard", weight: 0.4 },
	{ name: "my-web-app", weight: 0.4 },
	{ name: null, weight: 0.2 },
] as const;

type ToolDef = {
	toolName: string;
	mcpServerName: string | null;
	mcpToolName: string | null;
	skillName: string | null;
	weight: number;
};

const TOOLS: ToolDef[] = [
	// Builtin ツール
	{
		toolName: "Read",
		mcpServerName: null,
		mcpToolName: null,
		skillName: null,
		weight: 0.2,
	},
	{
		toolName: "Edit",
		mcpServerName: null,
		mcpToolName: null,
		skillName: null,
		weight: 0.15,
	},
	{
		toolName: "Write",
		mcpServerName: null,
		mcpToolName: null,
		skillName: null,
		weight: 0.08,
	},
	{
		toolName: "Bash",
		mcpServerName: null,
		mcpToolName: null,
		skillName: null,
		weight: 0.15,
	},
	{
		toolName: "Grep",
		mcpServerName: null,
		mcpToolName: null,
		skillName: null,
		weight: 0.1,
	},
	{
		toolName: "Glob",
		mcpServerName: null,
		mcpToolName: null,
		skillName: null,
		weight: 0.08,
	},
	{
		toolName: "Task",
		mcpServerName: null,
		mcpToolName: null,
		skillName: null,
		weight: 0.04,
	},
	{
		toolName: "WebFetch",
		mcpServerName: null,
		mcpToolName: null,
		skillName: null,
		weight: 0.04,
	},
	{
		toolName: "WebSearch",
		mcpServerName: null,
		mcpToolName: null,
		skillName: null,
		weight: 0.02,
	},
	{
		toolName: "AskUserQuestion",
		mcpServerName: null,
		mcpToolName: null,
		skillName: null,
		weight: 0.02,
	},
	{
		toolName: "ToolSearch",
		mcpServerName: null,
		mcpToolName: null,
		skillName: null,
		weight: 0.01,
	},
	// MCP ツール（本番では tool_name は全て "mcp_tool" 固定）
	{
		toolName: "mcp_tool",
		mcpServerName: "serena",
		mcpToolName: "find_symbol",
		skillName: null,
		weight: 0.04,
	},
	{
		toolName: "mcp_tool",
		mcpServerName: "serena",
		mcpToolName: "get_symbols_overview",
		skillName: null,
		weight: 0.03,
	},
	{
		toolName: "mcp_tool",
		mcpServerName: "chrome-devtools",
		mcpToolName: "take_screenshot",
		skillName: null,
		weight: 0.03,
	},
	// Skill ツール
	{
		toolName: "Skill",
		mcpServerName: null,
		mcpToolName: null,
		skillName: "commit",
		weight: 0.04,
	},
	{
		toolName: "Skill",
		mcpServerName: null,
		mcpToolName: null,
		skillName: "TDD",
		weight: 0.03,
	},
	{
		toolName: "Skill",
		mcpServerName: null,
		mcpToolName: null,
		skillName: "finish",
		weight: 0.03,
	},
];

const PROMPTS = [
	"Fix the login bug in the authentication module",
	"Add unit tests for the user service",
	"Refactor the API client to use fetch instead of axios",
	"Update the README with the new deployment instructions",
	"Implement dark mode toggle for the dashboard",
	"Add pagination to the user list endpoint",
	"Fix the CSS layout issue on the settings page",
	"Create a new migration for the notifications table",
	"Optimize the database queries for the reporting page",
	"Add error handling to the file upload component",
	"Implement the search functionality for the blog",
	"Update dependencies to latest versions",
	"Add TypeScript strict mode and fix type errors",
	"Create a reusable modal component",
	"Fix the race condition in the WebSocket handler",
];

const ERROR_MESSAGES = [
	"Rate limit exceeded",
	"Internal server error",
	"Request timeout",
	"Service temporarily unavailable",
	"Too many tokens in request",
];

const DAYS = 7;
const SESSIONS_PER_DAY = { min: 3, max: 5 };
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// --- Utilities ---

function randInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

function pick<T>(arr: readonly T[]): T {
	return arr[randInt(0, arr.length - 1)];
}

function weightedPick<T extends { weight: number }>(items: readonly T[]): T {
	const r = Math.random();
	let cumulative = 0;
	for (const item of items) {
		cumulative += item.weight;
		if (r < cumulative) return item;
	}
	return items[items.length - 1];
}

function pickModel(): keyof typeof MODELS {
	const items = MODEL_NAMES.map((name) => ({
		name,
		weight: MODELS[name].weight,
	}));
	return weightedPick(items).name;
}

function sqlEscape(value: string | null): string {
	if (value === null) return "NULL";
	return `'${value.replace(/'/g, "''")}'`;
}

function uuid(): string {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function buildToolParameters(tool: ToolDef): string | null {
	const params: Record<string, string> = {};
	if (tool.mcpServerName) params.mcp_server_name = tool.mcpServerName;
	if (tool.mcpToolName) params.mcp_tool_name = tool.mcpToolName;
	if (tool.skillName) params.skill_name = tool.skillName;
	if (tool.toolName === "Bash") {
		params.bash_command = pick([
			"ls",
			"git status",
			"pnpm test",
			"cat README.md",
		]);
		params.description = pick([
			"List files",
			"Show git status",
			"Run tests",
			"Read file",
		]);
	}
	if (Object.keys(params).length === 0) return null;
	return JSON.stringify(params);
}

// --- Data Generation ---

type EventRecord = {
	table: string;
	timestampMs: number;
	sql: string;
};

function generateSession(
	dayOffset: number,
	sessionIndex: number,
): { sessionSql: string; eventRecords: EventRecord[] } {
	const sessionId = uuid();
	const repo = weightedPick(REPOSITORIES).name;

	const now = Date.now();
	const dayStart = now - dayOffset * MS_PER_DAY;
	// Spread sessions across the day (9:00-21:00 range)
	const sessionStartOffset =
		(9 * 60 + sessionIndex * randInt(60, 180)) * 60 * 1000;
	const sessionStart = dayStart - 24 * 60 * 60 * 1000 + sessionStartOffset;
	const sessionDurationMs = randInt(10, 60) * 60 * 1000; // 10-60 minutes

	const events: EventRecord[] = [];
	let currentTime = sessionStart;

	// User prompts (1-2 at the start)
	const promptCount = randInt(1, 2);
	for (let i = 0; i < promptCount; i++) {
		const prompt = pick(PROMPTS);
		const timestampMs = currentTime + randInt(0, 30000);
		const timestampNs = `${timestampMs}000000`;
		events.push({
			table: "user_prompts",
			timestampMs,
			sql: `INSERT INTO user_prompts (session_id, event_sequence, timestamp_ns, timestamp_ms, prompt_length, prompt) VALUES (${sqlEscape(sessionId)}, NULL, ${sqlEscape(timestampNs)}, ${timestampMs}, ${prompt.length}, ${sqlEscape(prompt)});`,
		});
		currentTime = timestampMs + randInt(1000, 5000);
	}

	// Generate interleaved API requests, tool decisions, and tool results
	const apiRequestCount = randInt(5, 15);
	const toolResultCount = randInt(5, 20);
	const toolDecisionCount = randInt(3, 10);
	const hasApiError = Math.random() < 0.2;

	// API requests spread across session
	for (let i = 0; i < apiRequestCount; i++) {
		const progress = i / apiRequestCount;
		const timestampMs =
			sessionStart +
			Math.floor(progress * sessionDurationMs) +
			randInt(0, 30000);
		const timestampNs = `${timestampMs}000000`;
		const model = pickModel();
		const [costMin, costMax] = MODELS[model].costRange;

		events.push({
			table: "api_requests",
			timestampMs,
			sql: `INSERT INTO api_requests (session_id, event_sequence, timestamp_ns, timestamp_ms, model, cost_usd, duration_ms, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens) VALUES (${sqlEscape(sessionId)}, NULL, ${sqlEscape(timestampNs)}, ${timestampMs}, ${sqlEscape(model)}, ${randFloat(costMin, costMax).toFixed(6)}, ${randInt(500, 5000)}, ${randInt(500, 10000)}, ${randInt(100, 2000)}, ${randInt(0, 5000)}, ${randInt(0, 1000)});`,
		});
	}

	// Tool results spread across session
	for (let i = 0; i < toolResultCount; i++) {
		const progress = i / toolResultCount;
		const timestampMs =
			sessionStart +
			Math.floor(progress * sessionDurationMs) +
			randInt(0, 30000);
		const timestampNs = `${timestampMs}000000`;
		const tool = weightedPick(TOOLS);
		const success = Math.random() < 0.9;
		const durationMs = randInt(50, 2000);
		const error = success ? null : "Command failed with exit code 1";
		const toolParameters = buildToolParameters(tool);

		events.push({
			table: "tool_results",
			timestampMs,
			sql: `INSERT INTO tool_results (session_id, event_sequence, timestamp_ns, timestamp_ms, tool_name, success, duration_ms, error, tool_parameters, mcp_server_name, mcp_tool_name, skill_name) VALUES (${sqlEscape(sessionId)}, NULL, ${sqlEscape(timestampNs)}, ${timestampMs}, ${sqlEscape(tool.toolName)}, ${success ? 1 : 0}, ${durationMs}, ${sqlEscape(error)}, ${sqlEscape(toolParameters)}, ${sqlEscape(tool.mcpServerName)}, ${sqlEscape(tool.mcpToolName)}, ${sqlEscape(tool.skillName)});`,
		});
	}

	// Tool decisions spread across session
	for (let i = 0; i < toolDecisionCount; i++) {
		const progress = i / toolDecisionCount;
		const timestampMs =
			sessionStart +
			Math.floor(progress * sessionDurationMs) +
			randInt(0, 30000);
		const timestampNs = `${timestampMs}000000`;
		const tool = weightedPick(TOOLS);
		const decision = Math.random() < 0.85 ? "accept" : "reject";
		const source = pick([
			"config",
			"user_temporary",
			"user_permanent",
			"user_reject",
		]);

		events.push({
			table: "tool_decisions",
			timestampMs,
			sql: `INSERT INTO tool_decisions (session_id, event_sequence, timestamp_ns, timestamp_ms, tool_name, decision, source) VALUES (${sqlEscape(sessionId)}, NULL, ${sqlEscape(timestampNs)}, ${timestampMs}, ${sqlEscape(tool.toolName)}, ${sqlEscape(decision)}, ${sqlEscape(source)});`,
		});
	}

	// API error (rare)
	if (hasApiError) {
		const timestampMs =
			sessionStart + Math.floor(randFloat(0.3, 0.8) * sessionDurationMs);
		const timestampNs = `${timestampMs}000000`;
		const model = pickModel();
		const errorMsg = pick(ERROR_MESSAGES);
		const statusCode = pick([null, 429, 500, 503]);

		events.push({
			table: "api_errors",
			timestampMs,
			sql: `INSERT INTO api_errors (session_id, event_sequence, timestamp_ns, timestamp_ms, model, error, status_code, duration_ms, attempt) VALUES (${sqlEscape(sessionId)}, NULL, ${sqlEscape(timestampNs)}, ${timestampMs}, ${sqlEscape(model)}, ${sqlEscape(errorMsg)}, ${statusCode ?? "NULL"}, ${randInt(500, 5000)}, 1);`,
		});
	}

	// Sort events by timestamp and assign event_sequence
	events.sort((a, b) => a.timestampMs - b.timestampMs);
	for (let i = 0; i < events.length; i++) {
		events[i].sql = events[i].sql.replace(/, NULL, /, `, ${i + 1}, `);
	}

	// Session record
	const firstTs = events[0].timestampMs;
	const lastTs = events[events.length - 1].timestampMs;
	const sessionSql = `INSERT INTO sessions (session_id, repository, first_event_at, last_event_at) VALUES (${sqlEscape(sessionId)}, ${sqlEscape(repo)}, ${firstTs}, ${lastTs});`;

	return { sessionSql, eventRecords: events };
}

// --- Main ---

function main() {
	const lines: string[] = [];

	lines.push("-- Seed data generated by scripts/seed.ts");
	lines.push(`-- Generated at: ${new Date().toISOString()}`);
	lines.push("");

	// Delete existing data (order matters for foreign key-like consistency)
	lines.push("-- Clean existing data");
	lines.push("DELETE FROM api_errors;");
	lines.push("DELETE FROM tool_decisions;");
	lines.push("DELETE FROM tool_results;");
	lines.push("DELETE FROM user_prompts;");
	lines.push("DELETE FROM api_requests;");
	lines.push("DELETE FROM sessions;");
	lines.push("");

	lines.push("-- Insert seed data");

	const allSessionSqls: string[] = [];
	const allEventSqls: string[] = [];

	for (let day = 0; day < DAYS; day++) {
		const sessionsToday = randInt(SESSIONS_PER_DAY.min, SESSIONS_PER_DAY.max);
		for (let s = 0; s < sessionsToday; s++) {
			const { sessionSql, eventRecords } = generateSession(day, s);
			allSessionSqls.push(sessionSql);
			for (const record of eventRecords) {
				allEventSqls.push(record.sql);
			}
		}
	}

	lines.push("");
	lines.push("-- Sessions");
	lines.push(...allSessionSqls);

	lines.push("");
	lines.push("-- Events");
	lines.push(...allEventSqls);

	const sql = lines.join("\n") + "\n";

	const scriptDir = dirname(fileURLToPath(import.meta.url));
	const outputPath = resolve(scriptDir, ".seed.sql");
	writeFileSync(outputPath, sql);

	const sessionCount = allSessionSqls.length;
	const eventCount = allEventSqls.length;
	console.log(
		`Seed SQL written to ${outputPath} (${sessionCount} sessions, ${eventCount} events)`,
	);
}

main();
