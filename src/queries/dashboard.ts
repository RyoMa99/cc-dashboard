// フィルタの3状態: undefined=フィルタなし, string=リポジトリ指定, null=未分類(IS NULL)
export type RepoFilter = string | null | undefined;

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
  mcpServerName: string | null;
  mcpToolName: string | null;
  skillName: string | null;
};

export type SessionRow = {
  sessionId: string;
  repository: string | null;
  totalCost: number;
  totalTokens: number;
  toolCalls: number;
  apiCalls: number;
  firstSeen: number;
  lastSeen: number;
};

export type RepositoryCostRow = {
  repository: string;
  totalCost: number;
  sessionCount: number;
  apiCallCount: number;
};

export function buildRepoJoin(
  repo: RepoFilter,
  alias: string,
): { join: string; where: string; binds: unknown[] } {
  if (repo === undefined) return { join: "", where: "", binds: [] };
  if (repo === null)
    return {
      join: `JOIN sessions s ON ${alias}.session_id = s.session_id`,
      where: "AND s.repository IS NULL",
      binds: [],
    };
  return {
    join: `JOIN sessions s ON ${alias}.session_id = s.session_id`,
    where: "AND s.repository = ?",
    binds: [repo],
  };
}

export async function getOverviewStats(
  db: D1Database,
  repo?: RepoFilter,
): Promise<OverviewStats> {
  const repoJoin = buildRepoJoin(repo, "a");

  const [costResult, sessionResult, errorResult] = await db.batch([
    db
      .prepare(
        `SELECT
				COALESCE(SUM(a.cost_usd), 0) as total_cost,
				COALESCE(SUM(a.input_tokens), 0) as total_input_tokens,
				COALESCE(SUM(a.output_tokens), 0) as total_output_tokens,
				COALESCE(SUM(a.cache_read_tokens), 0) as total_cache_read_tokens,
				COALESCE(SUM(a.cache_creation_tokens), 0) as total_cache_creation_tokens,
				COUNT(*) as api_call_count
			FROM api_requests a
			${repoJoin.join}
			WHERE 1=1 ${repoJoin.where}`,
      )
      .bind(...repoJoin.binds),
    db
      .prepare(
        `SELECT COUNT(DISTINCT a.session_id) as session_count
			FROM api_requests a
			${repoJoin.join}
			WHERE 1=1 ${repoJoin.where}`,
      )
      .bind(...repoJoin.binds),
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
  repo?: RepoFilter,
): Promise<DailyCostRow[]> {
  const repoJoin = buildRepoJoin(repo, "a");
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const result = await db
    .prepare(
      `SELECT
				date(a.timestamp_ms / 1000, 'unixepoch', '+9 hours') as date,
				a.model,
				SUM(a.cost_usd) as cost,
				COUNT(*) as calls
			FROM api_requests a
			${repoJoin.join}
			WHERE a.timestamp_ms >= ? ${repoJoin.where}
			GROUP BY date, a.model
			ORDER BY date DESC, cost DESC`,
    )
    .bind(cutoff, ...repoJoin.binds)
    .all();

  return result.results.map((row) => ({
    date: row.date as string,
    model: row.model as string,
    cost: row.cost as number,
    calls: row.calls as number,
  }));
}

export async function getDailyTokens(
  db: D1Database,
  days = 30,
  repo?: RepoFilter,
): Promise<DailyTokenRow[]> {
  const repoJoin = buildRepoJoin(repo, "a");
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const result = await db
    .prepare(
      `SELECT
				date(a.timestamp_ms / 1000, 'unixepoch', '+9 hours') as date,
				SUM(a.input_tokens) as input_tokens,
				SUM(a.output_tokens) as output_tokens,
				SUM(a.cache_read_tokens) as cache_read_tokens,
				SUM(a.cache_creation_tokens) as cache_creation_tokens
			FROM api_requests a
			${repoJoin.join}
			WHERE a.timestamp_ms >= ? ${repoJoin.where}
			GROUP BY date
			ORDER BY date DESC`,
    )
    .bind(cutoff, ...repoJoin.binds)
    .all();

  return result.results.map((row) => ({
    date: row.date as string,
    inputTokens: row.input_tokens as number,
    outputTokens: row.output_tokens as number,
    cacheReadTokens: row.cache_read_tokens as number,
    cacheCreationTokens: row.cache_creation_tokens as number,
  }));
}

export async function getToolUsage(
  db: D1Database,
  repo?: RepoFilter,
): Promise<ToolUsageRow[]> {
  const repoJoin = buildRepoJoin(repo, "tr");

  const result = await db
    .prepare(
      `SELECT
				tr.tool_name,
				tr.mcp_server_name,
				tr.mcp_tool_name,
				tr.skill_name,
				COUNT(*) as call_count,
				SUM(tr.success) as success_count,
				ROUND(AVG(tr.success) * 100, 1) as success_rate,
				ROUND(AVG(tr.duration_ms), 0) as avg_duration_ms
			FROM tool_results tr
			${repoJoin.join}
			WHERE 1=1 ${repoJoin.where}
			GROUP BY tr.tool_name, tr.mcp_server_name, tr.mcp_tool_name, tr.skill_name
			ORDER BY call_count DESC`,
    )
    .bind(...repoJoin.binds)
    .all();

  return result.results.map((row) => ({
    toolName: row.tool_name as string,
    callCount: row.call_count as number,
    successCount: row.success_count as number,
    successRate: row.success_rate as number,
    avgDurationMs: row.avg_duration_ms as number,
    mcpServerName: (row.mcp_server_name as string | null) ?? null,
    mcpToolName: (row.mcp_tool_name as string | null) ?? null,
    skillName: (row.skill_name as string | null) ?? null,
  }));
}

export async function getRecentSessions(
  db: D1Database,
  limit = 20,
  repo?: RepoFilter,
): Promise<SessionRow[]> {
  // repo フィルタ有無に関わらず sessions を JOIN して repository を取得
  const hasFilter = repo !== undefined;
  const joinType = hasFilter ? "JOIN" : "LEFT JOIN";
  const whereClause =
    repo === null
      ? "AND s.repository IS NULL"
      : repo !== undefined
        ? "AND s.repository = ?"
        : "";
  const filterBinds: unknown[] =
    repo !== undefined && repo !== null ? [repo] : [];

  const result = await db
    .prepare(
      `SELECT
				a.session_id,
				s.repository,
				COALESCE(SUM(a.cost_usd), 0) as total_cost,
				COALESCE(SUM(a.input_tokens + a.output_tokens + a.cache_read_tokens + a.cache_creation_tokens), 0) as total_tokens,
				COALESCE(t.tool_calls, 0) as tool_calls,
				COUNT(*) as api_calls,
				MIN(a.timestamp_ms) as first_seen,
				MAX(a.timestamp_ms) as last_seen
			FROM api_requests a
			${joinType} sessions s ON a.session_id = s.session_id
			LEFT JOIN (
				SELECT session_id, COUNT(*) as tool_calls
				FROM tool_results
				GROUP BY session_id
			) t ON a.session_id = t.session_id
			WHERE 1=1 ${whereClause}
			GROUP BY a.session_id
			ORDER BY last_seen DESC
			LIMIT ?`,
    )
    .bind(...filterBinds, limit)
    .all();

  return result.results.map((row) => ({
    sessionId: row.session_id as string,
    repository: (row.repository as string | null) ?? null,
    totalCost: row.total_cost as number,
    totalTokens: row.total_tokens as number,
    toolCalls: row.tool_calls as number,
    apiCalls: row.api_calls as number,
    firstSeen: row.first_seen as number,
    lastSeen: row.last_seen as number,
  }));
}

export async function getRepositoryCosts(
  db: D1Database,
): Promise<RepositoryCostRow[]> {
  const result = await db
    .prepare(
      `SELECT
				COALESCE(s.repository, '未分類') as repository,
				SUM(a.cost_usd) as total_cost,
				COUNT(DISTINCT a.session_id) as session_count,
				COUNT(*) as api_call_count
			FROM api_requests a
			JOIN sessions s ON a.session_id = s.session_id
			GROUP BY COALESCE(s.repository, '未分類')
			ORDER BY total_cost DESC`,
    )
    .all();

  return result.results.map((row) => ({
    repository: row.repository as string,
    totalCost: row.total_cost as number,
    sessionCount: row.session_count as number,
    apiCallCount: row.api_call_count as number,
  }));
}

export async function getDistinctRepositories(
  db: D1Database,
): Promise<string[]> {
  const result = await db
    .prepare(
      `SELECT DISTINCT repository
			FROM sessions
			WHERE repository IS NOT NULL
			ORDER BY repository`,
    )
    .all();

  return result.results.map((row) => row.repository as string);
}
