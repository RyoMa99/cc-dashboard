// パース済みドメイン型
// OTLP ペイロードから抽出した構造化データ

export type ParsedApiRequest = {
  sessionId: string;
  eventSequence: number | null;
  timestampNs: string;
  timestampMs: number;
  model: string;
  costUsd: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
};

export type ParsedToolResult = {
  sessionId: string;
  eventSequence: number | null;
  timestampNs: string;
  timestampMs: number;
  toolName: string;
  success: boolean;
  durationMs: number;
  error: string | null;
  toolParameters: string | null;
  mcpServerName: string | null;
  mcpToolName: string | null;
  skillName: string | null;
};

export type ParsedUserPrompt = {
  sessionId: string;
  eventSequence: number | null;
  timestampNs: string;
  timestampMs: number;
  promptLength: number;
  prompt: string | null;
};

export type ParsedToolDecision = {
  sessionId: string;
  eventSequence: number | null;
  timestampNs: string;
  timestampMs: number;
  toolName: string;
  decision: string;
  source: string | null;
};

export type ParsedApiError = {
  sessionId: string;
  eventSequence: number | null;
  timestampNs: string;
  timestampMs: number;
  model: string | null;
  error: string;
  statusCode: number | null;
  durationMs: number;
  attempt: number;
};

export type ParsedLogEvent =
  | { type: "api_request"; data: ParsedApiRequest }
  | { type: "tool_result"; data: ParsedToolResult }
  | { type: "api_error"; data: ParsedApiError }
  | { type: "user_prompt"; data: ParsedUserPrompt }
  | { type: "tool_decision"; data: ParsedToolDecision }
  | { type: "unknown"; eventName: string };

export type ParsedResourceContext = {
  sessionId: string;
  repository: string | null;
};

export type ParseLogsResult = {
  events: ParsedLogEvent[];
  resourceContexts: ParsedResourceContext[];
};

export type ParsedMetricDataPoint = {
  sessionId: string | null;
  metricName: string;
  value: number;
  timestampNs: string;
  timestampMs: number;
  attrType: string | null;
  attrModel: string | null;
  attributesJson: string | null;
};
