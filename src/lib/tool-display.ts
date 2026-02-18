import type { ToolUsageRow } from "../queries/dashboard";

export type ToolCategory = "builtin" | "mcp" | "skill";

export type ToolDisplayInfo = {
  displayName: string;
  category: ToolCategory;
  serverName: string | null;
};

export function getToolDisplayInfo(row: ToolUsageRow): ToolDisplayInfo {
  // 1. mcpServerName あり → MCP ツール
  if (row.mcpServerName) {
    return {
      displayName: row.mcpToolName ?? row.toolName,
      category: "mcp",
      serverName: row.mcpServerName,
    };
  }

  // 2. toolName === "mcp_tool"（mcpServerName なしの旧データ）
  if (row.toolName === "mcp_tool") {
    return {
      displayName: "mcp_tool",
      category: "mcp",
      serverName: null,
    };
  }

  // 3. skillName あり → Skill
  if (row.skillName) {
    return {
      displayName: row.skillName,
      category: "skill",
      serverName: null,
    };
  }

  // 4. toolName === "Skill" → Skill（skillName なし）
  if (row.toolName === "Skill") {
    return {
      displayName: "Skill",
      category: "skill",
      serverName: null,
    };
  }

  // 5. それ以外 → builtin
  return {
    displayName: row.toolName,
    category: "builtin",
    serverName: null,
  };
}
