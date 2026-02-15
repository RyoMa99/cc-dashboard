import type { ToolUsageRow } from "../../queries/dashboard";
import { BAR_COLOR } from "./chart-utils";

const WIDTH = 600;
const ROW_HEIGHT = 30;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 10;
const LABEL_WIDTH = 160;
const BAR_LEFT = 170;
const BAR_MAX_WIDTH = 380;
const VALUE_OFFSET = 10;

export function ToolUsageChart({
	tools,
}: { tools: ToolUsageRow[] }): ReturnType<typeof Object> | null {
	if (tools.length === 0) return null;

	// callCount 降順でソート（既にクエリで降順だが保証する）
	const sorted = tools.slice().sort((a, b) => b.callCount - a.callCount);
	const maxCount = Math.max(...sorted.map((t) => t.callCount));
	const height = PADDING_TOP + sorted.length * ROW_HEIGHT + PADDING_BOTTOM;

	return (
		<div class="mb-4 overflow-x-auto">
			<svg
				viewBox={`0 0 ${WIDTH} ${height}`}
				width="100%"
				role="img"
				aria-label="Tool Usage Chart"
			>
				{sorted.map((tool, i) => {
					const y = PADDING_TOP + i * ROW_HEIGHT;
					const barW =
						maxCount > 0 ? (tool.callCount / maxCount) * BAR_MAX_WIDTH : 0;
					return (
						<g key={tool.toolName}>
							{/* ツール名 */}
							<text
								x={LABEL_WIDTH}
								y={y + ROW_HEIGHT / 2}
								fill="#d1d5db"
								font-size="11"
								text-anchor="end"
								dominant-baseline="middle"
							>
								{tool.toolName.length > 22
									? `${tool.toolName.slice(0, 22)}…`
									: tool.toolName}
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
									{tool.toolName}: {tool.callCount} calls, {tool.successRate}%,
									avg {tool.avgDurationMs}ms
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
