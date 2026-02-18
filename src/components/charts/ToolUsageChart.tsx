import { getToolDisplayInfo } from "../../lib/tool-display";
import type { ToolUsageRow } from "../../queries/dashboard";
import { BAR_COLOR } from "./chart-utils";

const FULL_WIDTH = 600;
const MIN_WIDTH = 400;
const SCALE_THRESHOLD = 8;
const ROW_HEIGHT = 30;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 10;
const LABEL_WIDTH = 160;
const BAR_LEFT = 170;
const VALUE_OFFSET = 10;
const LABEL_MAX_CHARS = 22;

function formatChartLabel(row: ToolUsageRow): string {
  const info = getToolDisplayInfo(row);
  if (info.category === "mcp" && info.serverName) {
    const label = `${info.serverName}/${info.displayName}`;
    return label.length > LABEL_MAX_CHARS
      ? `${label.slice(0, LABEL_MAX_CHARS)}…`
      : label;
  }
  const name = info.displayName;
  return name.length > LABEL_MAX_CHARS
    ? `${name.slice(0, LABEL_MAX_CHARS)}…`
    : name;
}

export function ToolUsageChart({
  tools,
}: {
  tools: ToolUsageRow[];
}): ReturnType<typeof Object> | null {
  if (tools.length === 0) return null;

  // callCount 降順でソート（既にクエリで降順だが保証する）
  const sorted = tools.slice().sort((a, b) => b.callCount - a.callCount);
  const maxCount = Math.max(...sorted.map((t) => t.callCount));
  const width =
    sorted.length >= SCALE_THRESHOLD
      ? FULL_WIDTH
      : Math.max(
          MIN_WIDTH,
          Math.round((FULL_WIDTH * sorted.length) / SCALE_THRESHOLD),
        );
  const barMaxWidth = width - BAR_LEFT - 50;
  const height = PADDING_TOP + sorted.length * ROW_HEIGHT + PADDING_BOTTOM;

  return (
    <div class="mb-4 overflow-x-auto" style={`max-width:${width}px`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label="Tool Usage Chart"
      >
        {sorted.map((tool, i) => {
          const y = PADDING_TOP + i * ROW_HEIGHT;
          const barW =
            maxCount > 0 ? (tool.callCount / maxCount) * barMaxWidth : 0;
          const label = formatChartLabel(tool);
          const info = getToolDisplayInfo(tool);
          const key =
            tool.toolName + (tool.skillName ?? "") + (tool.mcpToolName ?? "");
          return (
            <g key={key}>
              {/* ツール名 */}
              <text
                x={LABEL_WIDTH}
                y={y + ROW_HEIGHT / 2}
                fill="#d1d5db"
                font-size="11"
                text-anchor="end"
                dominant-baseline="middle"
              >
                {label}
              </text>
              {/* 水平棒 */}
              <rect
                x={BAR_LEFT}
                y={y + 6}
                width={Math.max(barW, 1)}
                height={ROW_HEIGHT - 12}
                fill={BAR_COLOR}
                rx="3"
              >
                <title>
                  {info.displayName}: {tool.callCount} calls, {tool.successRate}
                  %, avg {tool.avgDurationMs}ms
                </title>
              </rect>
              {/* 数値ラベル */}
              <text
                x={BAR_LEFT + barW + VALUE_OFFSET}
                y={y + ROW_HEIGHT / 2}
                fill="#9ca3af"
                font-size="11"
                dominant-baseline="middle"
              >
                {tool.callCount}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
