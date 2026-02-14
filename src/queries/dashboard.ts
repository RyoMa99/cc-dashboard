export type OverviewStats = {
	totalCost: number;
	totalInputTokens: number;
	totalOutputTokens: number;
	totalCacheReadTokens: number;
	totalCacheCreationTokens: number;
	sessionCount: number;
	apiCallCount: number;
	errorCount: number;
};

export type DailyCostRow = {
	date: string;
	model: string;
	cost: number;
	calls: number;
};

export type DailyTokenRow = {
	date: string;
	inputTokens: number;
	outputTokens: number;
	cacheReadTokens: number;
	cacheCreationTokens: number;
};

export type ToolUsageRow = {
	toolName: string;
	callCount: number;
	successCount: number;
	successRate: number;
	avgDurationMs: number;
};

export type SessionRow = {
	sessionId: string;
	totalCost: number;
	totalTokens: number;
	toolCalls: number;
	apiCalls: number;
	firstSeen: number;
	lastSeen: number;
};

export async function getOverviewStats(db: D1Database): Promise<OverviewStats> {
	const [costResult, sessionResult, errorResult] = await db.batch([
		db.prepare(`
			SELECT
				COALESCE(SUM(cost_usd), 0) as total_cost,
				COALESCE(SUM(input_tokens), 0) as total_input_tokens,
				COALESCE(SUM(output_tokens), 0) as total_output_tokens,
				COALESCE(SUM(cache_read_tokens), 0) as total_cache_read_tokens,
				COALESCE(SUM(cache_creation_tokens), 0) as total_cache_creation_tokens,
				COUNT(*) as api_call_count
			FROM api_requests
		`),
		db.prepare(`
			SELECT COUNT(DISTINCT session_id) as session_count
			FROM api_requests
		`),
		db.prepare(`
			SELECT COUNT(*) as error_count
			FROM api_errors
		`),
	]);

	const cost = costResult.results[0] as Record<string, number>;
	const session = sessionResult.results[0] as Record<string, number>;
	const error = errorResult.results[0] as Record<string, number>;

	return {
		totalCost: cost.total_cost,
		totalInputTokens: cost.total_input_tokens,
		totalOutputTokens: cost.total_output_tokens,
		totalCacheReadTokens: cost.total_cache_read_tokens,
		totalCacheCreationTokens: cost.total_cache_creation_tokens,
		sessionCount: session.session_count,
		apiCallCount: cost.api_call_count,
		errorCount: error.error_count,
	};
}

export async function getDailyCosts(
	db: D1Database,
	days = 30,
): Promise<DailyCostRow[]> {
	const result = await db
		.prepare(
			`SELECT
				date(timestamp_ms / 1000, 'unixepoch') as date,
				model,
				SUM(cost_usd) as cost,
				COUNT(*) as calls
			FROM api_requests
			WHERE timestamp_ms >= ?
			GROUP BY date, model
			ORDER BY date DESC, cost DESC`,
		)
		.bind(Date.now() - days * 24 * 60 * 60 * 1000)
		.all();

	return result.results.map((r) => ({
		date: r.date as string,
		model: r.model as string,
		cost: r.cost as number,
		calls: r.calls as number,
	}));
}

export async function getDailyTokens(
	db: D1Database,
	days = 30,
): Promise<DailyTokenRow[]> {
	const result = await db
		.prepare(
			`SELECT
				date(timestamp_ms / 1000, 'unixepoch') as date,
				SUM(input_tokens) as input_tokens,
				SUM(output_tokens) as output_tokens,
				SUM(cache_read_tokens) as cache_read_tokens,
				SUM(cache_creation_tokens) as cache_creation_tokens
			FROM api_requests
			WHERE timestamp_ms >= ?
			GROUP BY date
			ORDER BY date DESC`,
		)
		.bind(Date.now() - days * 24 * 60 * 60 * 1000)
		.all();

	return result.results.map((r) => ({
		date: r.date as string,
		inputTokens: r.input_tokens as number,
		outputTokens: r.output_tokens as number,
		cacheReadTokens: r.cache_read_tokens as number,
		cacheCreationTokens: r.cache_creation_tokens as number,
	}));
}

export async function getToolUsage(db: D1Database): Promise<ToolUsageRow[]> {
	const result = await db
		.prepare(
			`SELECT
				tool_name,
				COUNT(*) as call_count,
				SUM(success) as success_count,
				ROUND(AVG(success) * 100, 1) as success_rate,
				ROUND(AVG(duration_ms), 0) as avg_duration_ms
			FROM tool_results
			GROUP BY tool_name
			ORDER BY call_count DESC`,
		)
		.all();

	return result.results.map((r) => ({
		toolName: r.tool_name as string,
		callCount: r.call_count as number,
		successCount: r.success_count as number,
		successRate: r.success_rate as number,
		avgDurationMs: r.avg_duration_ms as number,
	}));
}

export async function getRecentSessions(
	db: D1Database,
	limit = 20,
): Promise<SessionRow[]> {
	const result = await db
		.prepare(
			`SELECT
				a.session_id,
				COALESCE(SUM(a.cost_usd), 0) as total_cost,
				COALESCE(SUM(a.input_tokens + a.output_tokens + a.cache_read_tokens + a.cache_creation_tokens), 0) as total_tokens,
				COALESCE(t.tool_calls, 0) as tool_calls,
				COUNT(*) as api_calls,
				MIN(a.timestamp_ms) as first_seen,
				MAX(a.timestamp_ms) as last_seen
			FROM api_requests a
			LEFT JOIN (
				SELECT session_id, COUNT(*) as tool_calls
				FROM tool_results
				GROUP BY session_id
			) t ON a.session_id = t.session_id
			GROUP BY a.session_id
			ORDER BY last_seen DESC
			LIMIT ?`,
		)
		.bind(limit)
		.all();

	return result.results.map((r) => ({
		sessionId: r.session_id as string,
		totalCost: r.total_cost as number,
		totalTokens: r.total_tokens as number,
		toolCalls: r.tool_calls as number,
		apiCalls: r.api_calls as number,
		firstSeen: r.first_seen as number,
		lastSeen: r.last_seen as number,
	}));
}
