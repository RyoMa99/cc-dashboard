import type { ToolUsageRow } from "../queries/dashboard";

export type ToolCategory = "builtin" | "mcp" | "skill";

export type ToolDisplayInfo = {
	displayName: string;
	category: ToolCategory;
	serverName: string | null;
};

const MCP_PREFIX = "mcp__";

export function getToolDisplayInfo(row: ToolUsageRow): ToolDisplayInfo {
	// 1. mcpServerName あり → MCP ツール
	if (row.mcpServerName) {
		return {
			displayName: row.mcpToolName ?? row.toolName,
			category: "mcp",
			serverName: row.mcpServerName,
		};
	}

	// 2. toolName が mcp__ 始まり（旧データフォールバック）
	if (row.toolName.startsWith(MCP_PREFIX)) {
		const parts = row.toolName.slice(MCP_PREFIX.length).split("__");
		if (parts.length >= 2) {
			return {
				displayName: parts.slice(1).join("__"),
				category: "mcp",
				serverName: parts[0],
			};
		}
	}

	// 3. toolName === "mcp_tool"（OTEL_LOG_TOOL_DETAILS 無効時の旧データ）
	if (row.toolName === "mcp_tool") {
		return {
			displayName: "mcp_tool",
			category: "mcp",
			serverName: null,
		};
	}

	// 4. skillName あり → Skill
	if (row.skillName) {
		return {
			displayName: row.skillName,
			category: "skill",
			serverName: null,
		};
	}

	// 5. toolName === "Skill" → Skill（skillName なし）
	if (row.toolName === "Skill") {
		return {
			displayName: "Skill",
			category: "skill",
			serverName: null,
		};
	}

	// 6. それ以外 → builtin
	return {
		displayName: row.toolName,
		category: "builtin",
		serverName: null,
	};
}
