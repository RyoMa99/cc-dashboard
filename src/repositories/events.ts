import type {
  ParsedApiError,
  ParsedApiRequest,
  ParsedToolDecision,
  ParsedToolResult,
  ParsedUserPrompt,
} from "../types/domain";

export type SessionUpsertData = {
  sessionId: string;
  repository: string | null;
  timestampMs: number;
};

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
			(session_id, event_sequence, timestamp_ns, timestamp_ms, tool_name, success, duration_ms, error, tool_parameters, mcp_server_name, mcp_tool_name, skill_name)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        r.toolParameters,
        r.mcpServerName,
        r.mcpToolName,
        r.skillName,
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

export async function insertUserPrompts(
  db: D1Database,
  prompts: ParsedUserPrompt[],
): Promise<void> {
  if (prompts.length === 0) return;

  const stmt = db.prepare(
    `INSERT INTO user_prompts
			(session_id, event_sequence, timestamp_ns, timestamp_ms, prompt_length, prompt)
		VALUES (?, ?, ?, ?, ?, ?)`,
  );

  await db.batch(
    prompts.map((p) =>
      stmt.bind(
        p.sessionId,
        p.eventSequence,
        p.timestampNs,
        p.timestampMs,
        p.promptLength,
        p.prompt,
      ),
    ),
  );
}

export async function insertToolDecisions(
  db: D1Database,
  decisions: ParsedToolDecision[],
): Promise<void> {
  if (decisions.length === 0) return;

  const stmt = db.prepare(
    `INSERT INTO tool_decisions
			(session_id, event_sequence, timestamp_ns, timestamp_ms, tool_name, decision, source)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  await db.batch(
    decisions.map((d) =>
      stmt.bind(
        d.sessionId,
        d.eventSequence,
        d.timestampNs,
        d.timestampMs,
        d.toolName,
        d.decision,
        d.source,
      ),
    ),
  );
}

export async function upsertSessions(
  db: D1Database,
  sessions: SessionUpsertData[],
): Promise<void> {
  if (sessions.length === 0) return;

  const stmt = db.prepare(
    `INSERT INTO sessions (session_id, repository, first_event_at, last_event_at)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(session_id) DO UPDATE SET
			repository = COALESCE(excluded.repository, sessions.repository),
			first_event_at = MIN(sessions.first_event_at, excluded.first_event_at),
			last_event_at = MAX(sessions.last_event_at, excluded.last_event_at)`,
  );

  await db.batch(
    sessions.map((s) =>
      stmt.bind(s.sessionId, s.repository, s.timestampMs, s.timestampMs),
    ),
  );
}
