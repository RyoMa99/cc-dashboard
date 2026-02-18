import { describe, expect, it } from "vitest";
import type { ExportLogsServiceRequest, KeyValue } from "../types/otlp";
import { parseLogsPayload } from "./otlp-logs";

function makeLogPayload(
  eventName: string,
  attrs: KeyValue[],
  options?: {
    sessionId?: string;
    resourceAttrs?: KeyValue[];
  },
): ExportLogsServiceRequest {
  const sessionId = options?.sessionId ?? "test-session-123";
  const extraResourceAttrs = options?.resourceAttrs ?? [];
  return {
    resourceLogs: [
      {
        resource: {
          attributes: [...extraResourceAttrs],
        },
        scopeLogs: [
          {
            logRecords: [
              {
                timeUnixNano: "1700000000000000000",
                attributes: [
                  {
                    key: "event.name",
                    value: { stringValue: eventName },
                  },
                  {
                    key: "session.id",
                    value: { stringValue: sessionId },
                  },
                  ...attrs,
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("parseLogsPayload", () => {
  describe("api_request イベント", () => {
    it("すべてのフィールドを正しくパースする", () => {
      const payload = makeLogPayload("api_request", [
        { key: "model", value: { stringValue: "claude-sonnet-4-5-20250929" } },
        { key: "cost_usd", value: { doubleValue: 0.003 } },
        { key: "duration_ms", value: { intValue: 1500 } },
        { key: "input_tokens", value: { intValue: 100 } },
        { key: "output_tokens", value: { intValue: 200 } },
        { key: "cache_read_tokens", value: { intValue: 50 } },
        { key: "cache_creation_tokens", value: { intValue: 10 } },
        { key: "event.sequence", value: { intValue: 1 } },
      ]);

      const result = parseLogsPayload(payload);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe("api_request");

      if (result.events[0].type !== "api_request")
        throw new Error("unreachable");
      const data = result.events[0].data;
      expect(data.sessionId).toBe("test-session-123");
      expect(data.model).toBe("claude-sonnet-4-5-20250929");
      expect(data.costUsd).toBe(0.003);
      expect(data.durationMs).toBe(1500);
      expect(data.inputTokens).toBe(100);
      expect(data.outputTokens).toBe(200);
      expect(data.cacheReadTokens).toBe(50);
      expect(data.cacheCreationTokens).toBe(10);
      expect(data.eventSequence).toBe(1);
      expect(data.timestampMs).toBe(1700000000000);
    });

    it("intValue が文字列でもパースできる", () => {
      const payload = makeLogPayload("api_request", [
        { key: "model", value: { stringValue: "claude-opus-4-6" } },
        { key: "input_tokens", value: { intValue: "500" } },
        { key: "duration_ms", value: { intValue: "2000" } },
      ]);

      const result = parseLogsPayload(payload);
      if (result.events[0].type !== "api_request")
        throw new Error("unreachable");
      expect(result.events[0].data.inputTokens).toBe(500);
      expect(result.events[0].data.durationMs).toBe(2000);
    });
  });

  describe("tool_result イベント", () => {
    it("成功ケースをパースする", () => {
      const payload = makeLogPayload("tool_result", [
        { key: "tool_name", value: { stringValue: "Read" } },
        { key: "success", value: { stringValue: "true" } },
        { key: "duration_ms", value: { intValue: 50 } },
      ]);

      const result = parseLogsPayload(payload);
      expect(result.events).toHaveLength(1);
      if (result.events[0].type !== "tool_result")
        throw new Error("unreachable");
      const data = result.events[0].data;
      expect(data.toolName).toBe("Read");
      expect(data.success).toBe(true);
      expect(data.durationMs).toBe(50);
      expect(data.error).toBeNull();
      expect(data.toolParameters).toBeNull();
      expect(data.mcpServerName).toBeNull();
      expect(data.mcpToolName).toBeNull();
      expect(data.skillName).toBeNull();
    });

    it("失敗ケースをパースする", () => {
      const payload = makeLogPayload("tool_result", [
        { key: "tool_name", value: { stringValue: "Bash" } },
        { key: "success", value: { stringValue: "false" } },
        { key: "error", value: { stringValue: "Command failed" } },
      ]);

      const result = parseLogsPayload(payload);
      if (result.events[0].type !== "tool_result")
        throw new Error("unreachable");
      expect(result.events[0].data.success).toBe(false);
      expect(result.events[0].data.error).toBe("Command failed");
    });

    it("tool_parameters を JSON 文字列として格納する", () => {
      const payload = makeLogPayload("tool_result", [
        { key: "tool_name", value: { stringValue: "Bash" } },
        {
          key: "tool_parameters",
          value: { stringValue: '{"command":"ls"}' },
        },
      ]);

      const result = parseLogsPayload(payload);
      if (result.events[0].type !== "tool_result")
        throw new Error("unreachable");
      expect(result.events[0].data.toolParameters).toBe('{"command":"ls"}');
      expect(result.events[0].data.mcpServerName).toBeNull();
      expect(result.events[0].data.mcpToolName).toBeNull();
      expect(result.events[0].data.skillName).toBeNull();
    });

    it("tool_parameters から MCP サーバー名・ツール名を抽出する", () => {
      const payload = makeLogPayload("tool_result", [
        {
          key: "tool_name",
          value: { stringValue: "mcp__chrome__click" },
        },
        {
          key: "tool_parameters",
          value: {
            stringValue: '{"mcp_server_name":"chrome","mcp_tool_name":"click"}',
          },
        },
      ]);

      const result = parseLogsPayload(payload);
      if (result.events[0].type !== "tool_result")
        throw new Error("unreachable");
      const data = result.events[0].data;
      expect(data.mcpServerName).toBe("chrome");
      expect(data.mcpToolName).toBe("click");
      expect(data.skillName).toBeNull();
    });

    it("tool_parameters から skill_name を抽出する", () => {
      const payload = makeLogPayload("tool_result", [
        { key: "tool_name", value: { stringValue: "Skill" } },
        {
          key: "tool_parameters",
          value: { stringValue: '{"skill_name":"commit"}' },
        },
      ]);

      const result = parseLogsPayload(payload);
      if (result.events[0].type !== "tool_result")
        throw new Error("unreachable");
      const data = result.events[0].data;
      expect(data.skillName).toBe("commit");
      expect(data.mcpServerName).toBeNull();
      expect(data.mcpToolName).toBeNull();
    });

    it("不正な JSON の tool_parameters では全フィールドが null になる", () => {
      const payload = makeLogPayload("tool_result", [
        { key: "tool_name", value: { stringValue: "Read" } },
        {
          key: "tool_parameters",
          value: { stringValue: "not-json" },
        },
      ]);

      const result = parseLogsPayload(payload);
      if (result.events[0].type !== "tool_result")
        throw new Error("unreachable");
      const data = result.events[0].data;
      expect(data.toolParameters).toBe("not-json");
      expect(data.mcpServerName).toBeNull();
      expect(data.mcpToolName).toBeNull();
      expect(data.skillName).toBeNull();
    });
  });

  describe("api_error イベント", () => {
    it("エラー情報をパースする", () => {
      const payload = makeLogPayload("api_error", [
        { key: "model", value: { stringValue: "claude-sonnet-4-5-20250929" } },
        { key: "error", value: { stringValue: "Rate limit exceeded" } },
        { key: "status_code", value: { intValue: 429 } },
        { key: "duration_ms", value: { intValue: 100 } },
        { key: "attempt", value: { intValue: 3 } },
      ]);

      const result = parseLogsPayload(payload);
      if (result.events[0].type !== "api_error") throw new Error("unreachable");
      const data = result.events[0].data;
      expect(data.model).toBe("claude-sonnet-4-5-20250929");
      expect(data.error).toBe("Rate limit exceeded");
      expect(data.statusCode).toBe(429);
      expect(data.durationMs).toBe(100);
      expect(data.attempt).toBe(3);
    });
  });

  describe("user_prompt イベント", () => {
    it("すべてのフィールドを正しくパースする", () => {
      const payload = makeLogPayload("user_prompt", [
        { key: "prompt_length", value: { intValue: 150 } },
        { key: "prompt", value: { stringValue: "Hello" } },
        { key: "event.sequence", value: { intValue: 5 } },
      ]);

      const result = parseLogsPayload(payload);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe("user_prompt");

      if (result.events[0].type !== "user_prompt")
        throw new Error("unreachable");
      const data = result.events[0].data;
      expect(data.sessionId).toBe("test-session-123");
      expect(data.promptLength).toBe(150);
      expect(data.prompt).toBe("Hello");
      expect(data.eventSequence).toBe(5);
      expect(data.timestampMs).toBe(1700000000000);
    });

    it("prompt 属性なしの場合 null になる", () => {
      const payload = makeLogPayload("user_prompt", [
        { key: "prompt_length", value: { intValue: 42 } },
      ]);

      const result = parseLogsPayload(payload);
      if (result.events[0].type !== "user_prompt")
        throw new Error("unreachable");
      expect(result.events[0].data.prompt).toBeNull();
    });

    it("prompt_length なしの場合 0 になる", () => {
      const payload = makeLogPayload("user_prompt", []);

      const result = parseLogsPayload(payload);
      if (result.events[0].type !== "user_prompt")
        throw new Error("unreachable");
      expect(result.events[0].data.promptLength).toBe(0);
    });
  });

  describe("tool_decision イベント", () => {
    it("すべてのフィールドを正しくパースする", () => {
      const payload = makeLogPayload("tool_decision", [
        { key: "tool_name", value: { stringValue: "Bash" } },
        { key: "decision", value: { stringValue: "reject" } },
        { key: "source", value: { stringValue: "user" } },
        { key: "event.sequence", value: { intValue: 3 } },
      ]);

      const result = parseLogsPayload(payload);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe("tool_decision");

      if (result.events[0].type !== "tool_decision")
        throw new Error("unreachable");
      const data = result.events[0].data;
      expect(data.sessionId).toBe("test-session-123");
      expect(data.toolName).toBe("Bash");
      expect(data.decision).toBe("reject");
      expect(data.source).toBe("user");
      expect(data.eventSequence).toBe(3);
    });

    it("source なしの場合 null になる", () => {
      const payload = makeLogPayload("tool_decision", [
        { key: "tool_name", value: { stringValue: "Bash" } },
        { key: "decision", value: { stringValue: "accept" } },
      ]);

      const result = parseLogsPayload(payload);
      if (result.events[0].type !== "tool_decision")
        throw new Error("unreachable");
      expect(result.events[0].data.source).toBeNull();
    });
  });

  describe("resourceContexts", () => {
    it("resource attributes から repository を抽出する", () => {
      const payload = makeLogPayload(
        "api_request",
        [
          {
            key: "model",
            value: { stringValue: "claude-sonnet-4-5-20250929" },
          },
        ],
        {
          resourceAttrs: [
            { key: "repository", value: { stringValue: "cc-dashboard" } },
          ],
        },
      );

      const result = parseLogsPayload(payload);
      expect(result.resourceContexts).toHaveLength(1);
      expect(result.resourceContexts[0].sessionId).toBe("test-session-123");
      expect(result.resourceContexts[0].repository).toBe("cc-dashboard");
    });

    it("repository なしの場合 null になる", () => {
      const payload = makeLogPayload("api_request", [
        { key: "model", value: { stringValue: "claude-sonnet-4-5-20250929" } },
      ]);

      const result = parseLogsPayload(payload);
      expect(result.resourceContexts).toHaveLength(1);
      expect(result.resourceContexts[0].repository).toBeNull();
    });
  });

  describe("エッジケース", () => {
    it("空のペイロードは空の結果を返す", () => {
      const result1 = parseLogsPayload({});
      expect(result1.events).toEqual([]);
      expect(result1.resourceContexts).toEqual([]);

      const result2 = parseLogsPayload({ resourceLogs: [] });
      expect(result2.events).toEqual([]);
      expect(result2.resourceContexts).toEqual([]);
    });

    it("event.name がないレコードはスキップする", () => {
      const payload: ExportLogsServiceRequest = {
        resourceLogs: [
          {
            scopeLogs: [
              {
                logRecords: [
                  {
                    timeUnixNano: "1700000000000000000",
                    attributes: [
                      { key: "some_key", value: { stringValue: "value" } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      expect(parseLogsPayload(payload).events).toEqual([]);
    });

    it("未知の event.name は unknown として返す", () => {
      const payload = makeLogPayload("some_future_event", []);
      const result = parseLogsPayload(payload);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe("unknown");
      if (result.events[0].type !== "unknown") throw new Error("unreachable");
      expect(result.events[0].eventName).toBe("some_future_event");
    });

    it("複数レコードをまとめてパースする", () => {
      const payload: ExportLogsServiceRequest = {
        resourceLogs: [
          {
            resource: {
              attributes: [
                {
                  key: "repository",
                  value: { stringValue: "my-repo" },
                },
              ],
            },
            scopeLogs: [
              {
                logRecords: [
                  {
                    timeUnixNano: "1700000000000000000",
                    attributes: [
                      {
                        key: "event.name",
                        value: { stringValue: "api_request" },
                      },
                      {
                        key: "session.id",
                        value: { stringValue: "s1" },
                      },
                      {
                        key: "model",
                        value: { stringValue: "claude-sonnet-4-5-20250929" },
                      },
                    ],
                  },
                  {
                    timeUnixNano: "1700000001000000000",
                    attributes: [
                      {
                        key: "event.name",
                        value: { stringValue: "tool_result" },
                      },
                      {
                        key: "session.id",
                        value: { stringValue: "s1" },
                      },
                      {
                        key: "tool_name",
                        value: { stringValue: "Edit" },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = parseLogsPayload(payload);
      expect(result.events).toHaveLength(2);
      expect(result.events[0].type).toBe("api_request");
      expect(result.events[1].type).toBe("tool_result");
      expect(result.resourceContexts).toHaveLength(2);
      expect(result.resourceContexts[0].repository).toBe("my-repo");
      expect(result.resourceContexts[0].sessionId).toBe("s1");
    });
  });
});
