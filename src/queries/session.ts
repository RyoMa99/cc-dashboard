export type SessionInfo = {
  sessionId: string;
  repository: string | null;
  firstEventAt: number;
  lastEventAt: number;
};

export type TimelineEvent =
  | {
      type: "user_prompt";
      eventSequence: number | null;
      timestampMs: number;
      promptLength: number;
      prompt: string | null;
    }
  | {
      type: "api_request";
      eventSequence: number | null;
      timestampMs: number;
      model: string;
      costUsd: number;
      durationMs: number;
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      cacheCreationTokens: number;
    }
  | {
      type: "tool_result";
      eventSequence: number | null;
      timestampMs: number;
      toolName: string;
      success: boolean;
      durationMs: number;
      error: string | null;
      toolParameters: string | null;
    }
  | {
      type: "tool_decision";
      eventSequence: number | null;
      timestampMs: number;
      toolName: string;
      decision: string;
      source: string | null;
    }
  | {
      type: "api_error";
      eventSequence: number | null;
      timestampMs: number;
      model: string | null;
      error: string;
      statusCode: number | null;
      durationMs: number;
      attempt: number;
    };

export async function getSessionInfo(
  db: D1Database,
  sessionId: string,
): Promise<SessionInfo | null> {
  const result = await db
    .prepare(
      "SELECT session_id, repository, first_event_at, last_event_at FROM sessions WHERE session_id = ?",
    )
    .bind(sessionId)
    .first();

  if (!result) return null;

  return {
    sessionId: result.session_id as string,
    repository: result.repository as string | null,
    firstEventAt: result.first_event_at as number,
    lastEventAt: result.last_event_at as number,
  };
}

export async function getSessionTimeline(
  db: D1Database,
  sessionId: string,
): Promise<TimelineEvent[]> {
  const [apiRequests, toolResults, userPrompts, toolDecisions, apiErrors] =
    await Promise.all([
      db
        .prepare(
          "SELECT event_sequence, timestamp_ms, model, cost_usd, duration_ms, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens FROM api_requests WHERE session_id = ?",
        )
        .bind(sessionId)
        .all(),
      db
        .prepare(
          "SELECT event_sequence, timestamp_ms, tool_name, success, duration_ms, error, tool_parameters FROM tool_results WHERE session_id = ?",
        )
        .bind(sessionId)
        .all(),
      db
        .prepare(
          "SELECT event_sequence, timestamp_ms, prompt_length, prompt FROM user_prompts WHERE session_id = ?",
        )
        .bind(sessionId)
        .all(),
      db
        .prepare(
          "SELECT event_sequence, timestamp_ms, tool_name, decision, source FROM tool_decisions WHERE session_id = ?",
        )
        .bind(sessionId)
        .all(),
      db
        .prepare(
          "SELECT event_sequence, timestamp_ms, model, error, status_code, duration_ms, attempt FROM api_errors WHERE session_id = ?",
        )
        .bind(sessionId)
        .all(),
    ]);

  const events: TimelineEvent[] = [
    ...apiRequests.results.map(
      (r): TimelineEvent => ({
        type: "api_request",
        eventSequence: r.event_sequence as number | null,
        timestampMs: r.timestamp_ms as number,
        model: r.model as string,
        costUsd: r.cost_usd as number,
        durationMs: r.duration_ms as number,
        inputTokens: r.input_tokens as number,
        outputTokens: r.output_tokens as number,
        cacheReadTokens: r.cache_read_tokens as number,
        cacheCreationTokens: r.cache_creation_tokens as number,
      }),
    ),
    ...toolResults.results.map(
      (r): TimelineEvent => ({
        type: "tool_result",
        eventSequence: r.event_sequence as number | null,
        timestampMs: r.timestamp_ms as number,
        toolName: r.tool_name as string,
        success: (r.success as number) === 1,
        durationMs: r.duration_ms as number,
        error: r.error as string | null,
        toolParameters: r.tool_parameters as string | null,
      }),
    ),
    ...userPrompts.results.map(
      (r): TimelineEvent => ({
        type: "user_prompt",
        eventSequence: r.event_sequence as number | null,
        timestampMs: r.timestamp_ms as number,
        promptLength: r.prompt_length as number,
        prompt: r.prompt as string | null,
      }),
    ),
    ...toolDecisions.results.map(
      (r): TimelineEvent => ({
        type: "tool_decision",
        eventSequence: r.event_sequence as number | null,
        timestampMs: r.timestamp_ms as number,
        toolName: r.tool_name as string,
        decision: r.decision as string,
        source: r.source as string | null,
      }),
    ),
    ...apiErrors.results.map(
      (r): TimelineEvent => ({
        type: "api_error",
        eventSequence: r.event_sequence as number | null,
        timestampMs: r.timestamp_ms as number,
        model: r.model as string | null,
        error: r.error as string,
        statusCode: r.status_code as number | null,
        durationMs: r.duration_ms as number,
        attempt: r.attempt as number,
      }),
    ),
  ];

  events.sort((a, b) => {
    const seqA = a.eventSequence ?? Number.MAX_SAFE_INTEGER;
    const seqB = b.eventSequence ?? Number.MAX_SAFE_INTEGER;
    if (seqA !== seqB) return seqA - seqB;
    return a.timestampMs - b.timestampMs;
  });

  return events;
}
