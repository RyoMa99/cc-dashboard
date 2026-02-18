import { describe, expect, it } from "vitest";
import type { ToolUsageRow } from "../queries/dashboard";
import { getToolDisplayInfo } from "./tool-display";

function makeRow(overrides: Partial<ToolUsageRow> = {}): ToolUsageRow {
  return {
    toolName: "Read",
    callCount: 10,
    successCount: 10,
    successRate: 100,
    avgDurationMs: 50,
    mcpServerName: null,
    mcpToolName: null,
    skillName: null,
    ...overrides,
  };
}

describe("getToolDisplayInfo", () => {
  it("MCP: mcpServerName + mcpToolName あり", () => {
    const result = getToolDisplayInfo(
      makeRow({
        toolName: "mcp_tool",
        mcpServerName: "chrome-devtools",
        mcpToolName: "click",
      }),
    );
    expect(result).toEqual({
      displayName: "click",
      category: "mcp",
      serverName: "chrome-devtools",
    });
  });

  it("MCP: toolName='mcp_tool' かつ mcpServerName=NULL（旧データ）", () => {
    const result = getToolDisplayInfo(
      makeRow({
        toolName: "mcp_tool",
        mcpServerName: null,
        mcpToolName: null,
      }),
    );
    expect(result).toEqual({
      displayName: "mcp_tool",
      category: "mcp",
      serverName: null,
    });
  });

  it("MCP: toolName='mcp_tool' かつ mcpServerName あり → case 1 で処理", () => {
    const result = getToolDisplayInfo(
      makeRow({
        toolName: "mcp_tool",
        mcpServerName: "chrome-devtools",
        mcpToolName: "navigate_page",
      }),
    );
    expect(result).toEqual({
      displayName: "navigate_page",
      category: "mcp",
      serverName: "chrome-devtools",
    });
  });

  it("Skill: skillName あり", () => {
    const result = getToolDisplayInfo(
      makeRow({
        toolName: "Skill",
        skillName: "commit",
      }),
    );
    expect(result).toEqual({
      displayName: "commit",
      category: "skill",
      serverName: null,
    });
  });

  it("Skill: skillName なし、toolName が Skill", () => {
    const result = getToolDisplayInfo(
      makeRow({
        toolName: "Skill",
        skillName: null,
      }),
    );
    expect(result).toEqual({
      displayName: "Skill",
      category: "skill",
      serverName: null,
    });
  });

  it("Builtin: 通常のツール", () => {
    const result = getToolDisplayInfo(
      makeRow({
        toolName: "Read",
      }),
    );
    expect(result).toEqual({
      displayName: "Read",
      category: "builtin",
      serverName: null,
    });
  });
});
