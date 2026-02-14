import type {
	ParsedApiError,
	ParsedApiRequest,
	ParsedToolResult,
} from "../types/domain";

export async function insertApiRequests(
	db: D1Database,
	requests: ParsedApiRequest[],
): Promise<void> {
	if (requests.length === 0) return;

	const stmt = db.prepare(
		`INSERT INTO api_requests
			(session_id, event_sequence, timestamp_ns, timestamp_ms, model, cost_usd, duration_ms, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	);

	await db.batch(
		requests.map((r) =>
			stmt.bind(
				r.sessionId,
				r.eventSequence,
				r.timestampNs,
				r.timestampMs,
				r.model,
				r.costUsd,
				r.durationMs,
				r.inputTokens,
				r.outputTokens,
				r.cacheReadTokens,
				r.cacheCreationTokens,
			),
		),
	);
}

export async function insertToolResults(
	db: D1Database,
	results: ParsedToolResult[],
): Promise<void> {
	if (results.length === 0) return;

	const stmt = db.prepare(
		`INSERT INTO tool_results
			(session_id, event_sequence, timestamp_ns, timestamp_ms, tool_name, success, duration_ms, error, decision, source)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	);

	await db.batch(
		results.map((r) =>
			stmt.bind(
				r.sessionId,
				r.eventSequence,
				r.timestampNs,
				r.timestampMs,
				r.toolName,
				r.success ? 1 : 0,
				r.durationMs,
				r.error,
				r.decision,
				r.source,
			),
		),
	);
}

export async function insertApiErrors(
	db: D1Database,
	errors: ParsedApiError[],
): Promise<void> {
	if (errors.length === 0) return;

	const stmt = db.prepare(
		`INSERT INTO api_errors
			(session_id, event_sequence, timestamp_ns, timestamp_ms, model, error, status_code, duration_ms, attempt)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	);

	await db.batch(
		errors.map((e) =>
			stmt.bind(
				e.sessionId,
				e.eventSequence,
				e.timestampNs,
				e.timestampMs,
				e.model,
				e.error,
				e.statusCode,
				e.durationMs,
				e.attempt,
			),
		),
	);
}
