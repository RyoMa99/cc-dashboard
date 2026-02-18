import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../index";
import type {
  ExportLogsServiceRequest,
  ExportMetricsServiceRequest,
} from "../types/otlp";

const AUTH_TOKEN = env.AUTH_TOKEN;

function authHeaders(token = AUTH_TOKEN) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function postLogs(payload: ExportLogsServiceRequest) {
  return app.request(
    "/v1/logs",
    { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) },
    env,
  );
}

describe("POST /v1/logs", () => {
  it("有効な token + api_request ペイロードで 200 を返しデータが保存される", async () => {
    const payload: ExportLogsServiceRequest = {
      resourceLogs: [
        {
          scopeLogs: [
            {
              logRecords: [
                {
                  timeUnixNano: "1700000000000000000",
                  attributes: [
                    {
                      key: "session.id",
                      value: { stringValue: "otlp-test-s1" },
                    },
                    {
                      key: "event.name",
                      value: { stringValue: "api_request" },
                    },
                    {
                      key: "model",
                      value: { stringValue: "claude-sonnet-4-5-20250929" },
                    },
                    { key: "cost_usd", value: { doubleValue: 0.005 } },
                    { key: "input_tokens", value: { intValue: 150 } },
                    { key: "output_tokens", value: { intValue: 75 } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const res = await postLogs(payload);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ partialSuccess: {} });

    const row = await env.DB.prepare(
      "SELECT * FROM api_requests WHERE session_id = ?",
    )
      .bind("otlp-test-s1")
      .first();
    expect(row).not.toBeNull();
    expect(row?.model).toBe("claude-sonnet-4-5-20250929");
    expect(row?.cost_usd).toBe(0.005);
  });

  it("有効な token + 空の logRecords で 200 を返しテーブルに挿入なし", async () => {
    const payload: ExportLogsServiceRequest = {
      resourceLogs: [{ scopeLogs: [{ logRecords: [] }] }],
    };

    const beforeCount = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM api_requests WHERE session_id = ?",
    )
      .bind("should-not-exist")
      .first();

    const res = await postLogs(payload);

    expect(res.status).toBe(200);

    const afterCount = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM api_requests WHERE session_id = ?",
    )
      .bind("should-not-exist")
      .first();
    expect(afterCount?.count).toBe(beforeCount?.count);
  });

  it("無効な Bearer token で 401 を返す", async () => {
    const res = await app.request(
      "/v1/logs",
      {
        method: "POST",
        headers: authHeaders("wrong-token"),
        body: JSON.stringify({ resourceLogs: [] }),
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("Authorization ヘッダーなしで 401 を返す", async () => {
    const res = await app.request(
      "/v1/logs",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceLogs: [] }),
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("user_prompt イベントで user_prompts に保存される", async () => {
    const payload: ExportLogsServiceRequest = {
      resourceLogs: [
        {
          scopeLogs: [
            {
              logRecords: [
                {
                  timeUnixNano: "1700000000000000000",
                  attributes: [
                    {
                      key: "session.id",
                      value: { stringValue: "otlp-up-1" },
                    },
                    {
                      key: "event.name",
                      value: { stringValue: "user_prompt" },
                    },
                    { key: "prompt_length", value: { intValue: 42 } },
                    { key: "prompt", value: { stringValue: "Hello" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const res = await postLogs(payload);
    expect(res.status).toBe(200);

    const row = await env.DB.prepare(
      "SELECT * FROM user_prompts WHERE session_id = ?",
    )
      .bind("otlp-up-1")
      .first();
    expect(row).not.toBeNull();
    expect(row?.prompt_length).toBe(42);
    expect(row?.prompt).toBe("Hello");
  });

  it("tool_decision イベントで tool_decisions に保存される", async () => {
    const payload: ExportLogsServiceRequest = {
      resourceLogs: [
        {
          scopeLogs: [
            {
              logRecords: [
                {
                  timeUnixNano: "1700000000000000000",
                  attributes: [
                    {
                      key: "session.id",
                      value: { stringValue: "otlp-td-1" },
                    },
                    {
                      key: "event.name",
                      value: { stringValue: "tool_decision" },
                    },
                    { key: "tool_name", value: { stringValue: "Bash" } },
                    { key: "decision", value: { stringValue: "reject" } },
                    { key: "source", value: { stringValue: "user" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const res = await postLogs(payload);
    expect(res.status).toBe(200);

    const row = await env.DB.prepare(
      "SELECT * FROM tool_decisions WHERE session_id = ?",
    )
      .bind("otlp-td-1")
      .first();
    expect(row).not.toBeNull();
    expect(row?.tool_name).toBe("Bash");
    expect(row?.decision).toBe("reject");
    expect(row?.source).toBe("user");
  });

  it("tool_result + tool_parameters で tool_parameters が格納される", async () => {
    const payload: ExportLogsServiceRequest = {
      resourceLogs: [
        {
          scopeLogs: [
            {
              logRecords: [
                {
                  timeUnixNano: "1700000000000000000",
                  attributes: [
                    {
                      key: "session.id",
                      value: { stringValue: "otlp-tp-1" },
                    },
                    {
                      key: "event.name",
                      value: { stringValue: "tool_result" },
                    },
                    { key: "tool_name", value: { stringValue: "Bash" } },
                    { key: "success", value: { stringValue: "true" } },
                    {
                      key: "tool_parameters",
                      value: { stringValue: '{"command":"ls -la"}' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const res = await postLogs(payload);
    expect(res.status).toBe(200);

    const row = await env.DB.prepare(
      "SELECT tool_parameters FROM tool_results WHERE session_id = ?",
    )
      .bind("otlp-tp-1")
      .first();
    expect(row?.tool_parameters).toBe('{"command":"ls -la"}');
  });

  it("resource attributes の repository が sessions に記録される", async () => {
    const payload: ExportLogsServiceRequest = {
      resourceLogs: [
        {
          resource: {
            attributes: [
              { key: "repository", value: { stringValue: "cc-dashboard" } },
            ],
          },
          scopeLogs: [
            {
              logRecords: [
                {
                  timeUnixNano: "1700000000000000000",
                  attributes: [
                    {
                      key: "session.id",
                      value: { stringValue: "otlp-repo-1" },
                    },
                    {
                      key: "event.name",
                      value: { stringValue: "api_request" },
                    },
                    {
                      key: "model",
                      value: { stringValue: "claude-sonnet-4-5-20250929" },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const res = await postLogs(payload);
    expect(res.status).toBe(200);

    const row = await env.DB.prepare(
      "SELECT * FROM sessions WHERE session_id = ?",
    )
      .bind("otlp-repo-1")
      .first();
    expect(row).not.toBeNull();
    expect(row?.repository).toBe("cc-dashboard");
    expect(row?.first_event_at).toBe(1700000000000);
    expect(row?.last_event_at).toBe(1700000000000);
  });

  it("api_request（既存イベント）で sessions に first/last_event_at が記録される", async () => {
    const payload: ExportLogsServiceRequest = {
      resourceLogs: [
        {
          scopeLogs: [
            {
              logRecords: [
                {
                  timeUnixNano: "1700000000000000000",
                  attributes: [
                    {
                      key: "session.id",
                      value: { stringValue: "otlp-session-1" },
                    },
                    {
                      key: "event.name",
                      value: { stringValue: "api_request" },
                    },
                    {
                      key: "model",
                      value: { stringValue: "claude-sonnet-4-5-20250929" },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const res = await postLogs(payload);
    expect(res.status).toBe(200);

    const row = await env.DB.prepare(
      "SELECT * FROM sessions WHERE session_id = ?",
    )
      .bind("otlp-session-1")
      .first();
    expect(row).not.toBeNull();
    expect(row?.first_event_at).toBe(1700000000000);
    expect(row?.last_event_at).toBe(1700000000000);
  });

  it("混合ペイロードで全イベント格納 + sessions 正しく upsert", async () => {
    const payload: ExportLogsServiceRequest = {
      resourceLogs: [
        {
          resource: {
            attributes: [
              { key: "repository", value: { stringValue: "test-repo" } },
            ],
          },
          scopeLogs: [
            {
              logRecords: [
                {
                  timeUnixNano: "1700000000000000000",
                  attributes: [
                    {
                      key: "session.id",
                      value: { stringValue: "otlp-mixed-1" },
                    },
                    {
                      key: "event.name",
                      value: { stringValue: "api_request" },
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
                      key: "session.id",
                      value: { stringValue: "otlp-mixed-1" },
                    },
                    {
                      key: "event.name",
                      value: { stringValue: "tool_result" },
                    },
                    { key: "tool_name", value: { stringValue: "Read" } },
                  ],
                },
                {
                  timeUnixNano: "1700000002000000000",
                  attributes: [
                    {
                      key: "session.id",
                      value: { stringValue: "otlp-mixed-1" },
                    },
                    {
                      key: "event.name",
                      value: { stringValue: "user_prompt" },
                    },
                    { key: "prompt_length", value: { intValue: 10 } },
                  ],
                },
                {
                  timeUnixNano: "1700000003000000000",
                  attributes: [
                    {
                      key: "session.id",
                      value: { stringValue: "otlp-mixed-1" },
                    },
                    {
                      key: "event.name",
                      value: { stringValue: "tool_decision" },
                    },
                    { key: "tool_name", value: { stringValue: "Bash" } },
                    { key: "decision", value: { stringValue: "accept" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const res = await postLogs(payload);
    expect(res.status).toBe(200);

    // 各テーブルにデータが存在する
    const apiRow = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM api_requests WHERE session_id = ?",
    )
      .bind("otlp-mixed-1")
      .first();
    expect(apiRow?.count).toBe(1);

    const toolRow = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM tool_results WHERE session_id = ?",
    )
      .bind("otlp-mixed-1")
      .first();
    expect(toolRow?.count).toBe(1);

    const promptRow = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM user_prompts WHERE session_id = ?",
    )
      .bind("otlp-mixed-1")
      .first();
    expect(promptRow?.count).toBe(1);

    const decisionRow = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM tool_decisions WHERE session_id = ?",
    )
      .bind("otlp-mixed-1")
      .first();
    expect(decisionRow?.count).toBe(1);

    // sessions が正しく upsert されている
    const sessionRow = await env.DB.prepare(
      "SELECT * FROM sessions WHERE session_id = ?",
    )
      .bind("otlp-mixed-1")
      .first();
    expect(sessionRow).not.toBeNull();
    expect(sessionRow?.repository).toBe("test-repo");
    expect(sessionRow?.first_event_at).toBe(1700000000000);
    expect(sessionRow?.last_event_at).toBe(1700000000000);
  });
});

describe("POST /v1/metrics", () => {
  it("有効な token + メトリクスペイロードで 200 を返しデータが保存される", async () => {
    const payload: ExportMetricsServiceRequest = {
      resourceMetrics: [
        {
          scopeMetrics: [
            {
              metrics: [
                {
                  name: "token_usage",
                  sum: {
                    dataPoints: [
                      {
                        timeUnixNano: "1700000000000000000",
                        asInt: 500,
                        attributes: [
                          {
                            key: "session.id",
                            value: { stringValue: "otlp-metric-s1" },
                          },
                          { key: "type", value: { stringValue: "input" } },
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const res = await app.request(
      "/v1/metrics",
      { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) },
      env,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ partialSuccess: {} });

    const row = await env.DB.prepare(
      "SELECT * FROM metric_data_points WHERE session_id = ?",
    )
      .bind("otlp-metric-s1")
      .first();
    expect(row).not.toBeNull();
    expect(row?.metric_name).toBe("token_usage");
    expect(row?.value).toBe(500);
  });

  it("無効な Bearer token で 401 を返す", async () => {
    const res = await app.request(
      "/v1/metrics",
      {
        method: "POST",
        headers: authHeaders("wrong-token"),
        body: JSON.stringify({ resourceMetrics: [] }),
      },
      env,
    );
    expect(res.status).toBe(401);
  });
});
