import type {
  ParsedApiError,
  ParsedApiRequest,
  ParsedLogEvent,
  ParsedResourceContext,
  ParsedToolDecision,
  ParsedToolResult,
  ParsedUserPrompt,
  ParseLogsResult,
} from "../types/domain";
import type {
  AnyValue,
  ExportLogsServiceRequest,
  KeyValue,
  LogRecord,
} from "../types/otlp";

export function parseLogsPayload(
  payload: ExportLogsServiceRequest,
): ParseLogsResult {
  const events: ParsedLogEvent[] = [];
  const resourceContexts: ParsedResourceContext[] = [];

  for (const rl of payload.resourceLogs ?? []) {
    const resourceAttrs = rl.resource?.attributes ?? [];
    const repository = getStringAttr(resourceAttrs, "repository");

    for (const sl of rl.scopeLogs ?? []) {
      for (const record of sl.logRecords ?? []) {
        const event = parseLogRecord(record, resourceAttrs);
        if (event) {
          events.push(event);
          if (event.type !== "unknown") {
            resourceContexts.push({
              sessionId: event.data.sessionId,
              repository,
            });
          }
        }
      }
    }
  }

  return { events, resourceContexts };
}

function parseLogRecord(
  record: LogRecord,
  resourceAttrs: KeyValue[],
): ParsedLogEvent | null {
  const attrs = record.attributes ?? [];
  const eventName = getStringAttr(attrs, "event.name");
  if (!eventName) return null;

  const sessionId =
    getStringAttr(attrs, "session.id") ||
    getStringAttr(resourceAttrs, "session.id") ||
    "unknown";
  const timestampNs = record.timeUnixNano ?? "0";
  const timestampMs = nsToMs(timestampNs);
  const eventSequence = getIntAttr(attrs, "event.sequence");

  switch (eventName) {
    case "api_request":
      return {
        type: "api_request",
        data: parseApiRequest(
          attrs,
          sessionId,
          eventSequence,
          timestampNs,
          timestampMs,
        ),
      };
    case "tool_result":
      return {
        type: "tool_result",
        data: parseToolResult(
          attrs,
          sessionId,
          eventSequence,
          timestampNs,
          timestampMs,
        ),
      };
    case "api_error":
      return {
        type: "api_error",
        data: parseApiError(
          attrs,
          sessionId,
          eventSequence,
          timestampNs,
          timestampMs,
        ),
      };
    case "user_prompt":
      return {
        type: "user_prompt",
        data: parseUserPrompt(
          attrs,
          sessionId,
          eventSequence,
          timestampNs,
          timestampMs,
        ),
      };
    case "tool_decision":
      return {
        type: "tool_decision",
        data: parseToolDecision(
          attrs,
          sessionId,
          eventSequence,
          timestampNs,
          timestampMs,
        ),
      };
    default:
      return { type: "unknown", eventName };
  }
}

function parseApiRequest(
  attrs: KeyValue[],
  sessionId: string,
  eventSequence: number | null,
  timestampNs: string,
  timestampMs: number,
): ParsedApiRequest {
  return {
    sessionId,
    eventSequence,
    timestampNs,
    timestampMs,
    model: getStringAttr(attrs, "model") ?? "unknown",
    costUsd: getDoubleAttr(attrs, "cost_usd") ?? 0,
    durationMs: getIntAttr(attrs, "duration_ms") ?? 0,
    inputTokens: getIntAttr(attrs, "input_tokens") ?? 0,
    outputTokens: getIntAttr(attrs, "output_tokens") ?? 0,
    cacheReadTokens: getIntAttr(attrs, "cache_read_tokens") ?? 0,
    cacheCreationTokens: getIntAttr(attrs, "cache_creation_tokens") ?? 0,
  };
}

function parseToolResult(
  attrs: KeyValue[],
  sessionId: string,
  eventSequence: number | null,
  timestampNs: string,
  timestampMs: number,
): ParsedToolResult {
  const toolParameters = getStringAttr(attrs, "tool_parameters") ?? null;
  const { mcpServerName, mcpToolName, skillName } =
    extractToolDetails(toolParameters);

  return {
    sessionId,
    eventSequence,
    timestampNs,
    timestampMs,
    toolName: getStringAttr(attrs, "tool_name") ?? "unknown",
    success: getStringAttr(attrs, "success") !== "false",
    durationMs: getIntAttr(attrs, "duration_ms") ?? 0,
    error: getStringAttr(attrs, "error") ?? null,
    toolParameters,
    mcpServerName,
    mcpToolName,
    skillName,
  };
}

function extractToolDetails(toolParameters: string | null): {
  mcpServerName: string | null;
  mcpToolName: string | null;
  skillName: string | null;
} {
  if (!toolParameters) {
    return { mcpServerName: null, mcpToolName: null, skillName: null };
  }
  try {
    const parsed = JSON.parse(toolParameters);
    return {
      mcpServerName:
        typeof parsed.mcp_server_name === "string"
          ? parsed.mcp_server_name
          : null,
      mcpToolName:
        typeof parsed.mcp_tool_name === "string" ? parsed.mcp_tool_name : null,
      skillName:
        typeof parsed.skill_name === "string" ? parsed.skill_name : null,
    };
  } catch {
    return { mcpServerName: null, mcpToolName: null, skillName: null };
  }
}

function parseApiError(
  attrs: KeyValue[],
  sessionId: string,
  eventSequence: number | null,
  timestampNs: string,
  timestampMs: number,
): ParsedApiError {
  return {
    sessionId,
    eventSequence,
    timestampNs,
    timestampMs,
    model: getStringAttr(attrs, "model") ?? null,
    error: getStringAttr(attrs, "error") ?? "unknown error",
    statusCode: getIntAttr(attrs, "status_code") ?? null,
    durationMs: getIntAttr(attrs, "duration_ms") ?? 0,
    attempt: getIntAttr(attrs, "attempt") ?? 1,
  };
}

function parseUserPrompt(
  attrs: KeyValue[],
  sessionId: string,
  eventSequence: number | null,
  timestampNs: string,
  timestampMs: number,
): ParsedUserPrompt {
  return {
    sessionId,
    eventSequence,
    timestampNs,
    timestampMs,
    promptLength: getIntAttr(attrs, "prompt_length") ?? 0,
    prompt: getStringAttr(attrs, "prompt") ?? null,
  };
}

function parseToolDecision(
  attrs: KeyValue[],
  sessionId: string,
  eventSequence: number | null,
  timestampNs: string,
  timestampMs: number,
): ParsedToolDecision {
  return {
    sessionId,
    eventSequence,
    timestampNs,
    timestampMs,
    toolName: getStringAttr(attrs, "tool_name") ?? "unknown",
    decision: getStringAttr(attrs, "decision") ?? "unknown",
    source: getStringAttr(attrs, "source") ?? null,
  };
}

// --- Attribute extraction helpers ---

export function getStringAttr(attrs: KeyValue[], key: string): string | null {
  const kv = attrs.find((a) => a.key === key);
  if (!kv) return null;
  return extractString(kv.value);
}

function getIntAttr(attrs: KeyValue[], key: string): number | null {
  const kv = attrs.find((a) => a.key === key);
  if (!kv) return null;
  return extractNumber(kv.value);
}

function getDoubleAttr(attrs: KeyValue[], key: string): number | null {
  const kv = attrs.find((a) => a.key === key);
  if (!kv) return null;
  return extractNumber(kv.value);
}

function extractString(value: AnyValue): string | null {
  if ("stringValue" in value) return value.stringValue;
  if ("intValue" in value) return String(value.intValue);
  if ("doubleValue" in value) return String(value.doubleValue);
  if ("boolValue" in value) return String(value.boolValue);
  return null;
}

function extractNumber(value: AnyValue): number | null {
  if ("intValue" in value) {
    return typeof value.intValue === "string"
      ? Number.parseInt(value.intValue, 10)
      : value.intValue;
  }
  if ("doubleValue" in value) return value.doubleValue;
  if ("stringValue" in value) {
    const n = Number(value.stringValue);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function nsToMs(ns: string): number {
  const n = BigInt(ns);
  return Number(n / 1000000n);
}
