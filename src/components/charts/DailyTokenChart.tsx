import type { DailyTokenRow } from "../../queries/dashboard";
import {
	calcDailyChartWidth,
	formatCompact,
	MAX_BAR_WIDTH,
	niceMax,
	PADDING,
	scaleLinear,
	TOKEN_COLORS,
} from "./chart-utils";

const HEIGHT = 320;
const TOKEN_KEYS = ["input", "output", "cacheRead", "cacheCreate"] as const;
const LEGEND_LABELS: Record<(typeof TOKEN_KEYS)[number], string> = {
	input: "Input",
	output: "Output",
	cacheRead: "Cache Read",
	cacheCreate: "Cache Create",
};

function fieldOf(row: DailyTokenRow, key: (typeof TOKEN_KEYS)[number]): number {
	switch (key) {
		case "input":
			return row.inputTokens;
		case "output":
			return row.outputTokens;
		case "cacheRead":
			return row.cacheReadTokens;
		case "cacheCreate":
			return row.cacheCreationTokens;
	}
}

export function DailyTokenChart({
	rows,
}: {
	rows: DailyTokenRow[];
}): ReturnType<typeof Object> | null {
	if (rows.length === 0) return null;

	const data = rows.slice().reverse(); // DESC → ASC
	const totals = data.map((r) =>
		TOKEN_KEYS.reduce((sum, k) => sum + fieldOf(r, k), 0),
	);
	const maxTotal = niceMax(Math.max(...totals));

	const width = calcDailyChartWidth(data.length);
	const chartW = width - PADDING.left - PADDING.right;
	const chartH = HEIGHT - PADDING.top - PADDING.bottom;
	const barW = Math.min(
		Math.max(1, (chartW / data.length) * 0.7),
		MAX_BAR_WIDTH,
	);
	const gap = (chartW / data.length) * 0.3;

	const yScale = scaleLinear([0, maxTotal], [chartH, 0]);

	const gridLines = 4;
	const gridStep = maxTotal / gridLines;

	// X軸ラベル間引き: 最大12個
	const labelInterval = Math.max(1, Math.ceil(data.length / 12));

	return (
		<div class="mb-4 overflow-x-auto" style={`max-width:${width}px`}>
			<svg
				viewBox={`0 0 ${width} ${HEIGHT}`}
				width="100%"
				role="img"
				aria-label="Daily Token Usage Chart"
			>
				{/* グリッド線 + Y軸ラベル */}
				{Array.from({ length: gridLines + 1 }, (_, i) => {
					const val = gridStep * i;
					const y = PADDING.top + yScale(val);
					return (
						<g key={`grid-${val}`}>
							<line
								x1={PADDING.left}
								y1={y}
								x2={width - PADDING.right}
								y2={y}
								stroke="#374151"
								stroke-width="1"
							/>
							<text
								x={PADDING.left - 8}
								y={y}
								fill="#9ca3af"
								font-size="11"
								text-anchor="end"
								dominant-baseline="middle"
							>
								{formatCompact(val)}
							</text>
						</g>
					);
				})}

				{/* 棒グラフ */}
				{data.map((row, i) => {
					const x = PADDING.left + i * (barW + gap) + gap / 2;
					let cumY = chartH;
					const formatDate = row.date.slice(5); // MM-DD → MM/DD的
					return (
						<g key={row.date}>
							{TOKEN_KEYS.map((key) => {
								const val = fieldOf(row, key);
								const barH = val > 0 ? (val / maxTotal) * chartH : 0;
								cumY -= barH;
								return (
									<rect
										key={key}
										x={x}
										y={PADDING.top + cumY}
										width={barW}
										height={barH}
										fill={TOKEN_COLORS[key]}
										rx="1"
									>
										<title>
											{row.date}: {LEGEND_LABELS[key]} {formatCompact(val)}
										</title>
									</rect>
								);
							})}
							{/* X軸ラベル */}
							{i % labelInterval === 0 && (
								<text
									x={x + barW / 2}
									y={HEIGHT - PADDING.bottom + PADDING.legend - 8}
									fill="#9ca3af"
									font-size="10"
									text-anchor="middle"
								>
									{formatDate}
								</text>
							)}
						</g>
					);
				})}

				{/* 凡例 */}
				{TOKEN_KEYS.map((key, i) => {
					const legendSpacing = Math.min(
						120,
						(width - PADDING.left - 20) / TOKEN_KEYS.length,
					);
					const lx = PADDING.left + i * legendSpacing;
					const ly = HEIGHT - 12;
					return (
						<g key={`legend-${key}`}>
							<rect
								x={lx}
								y={ly - 8}
								width="10"
								height="10"
								fill={TOKEN_COLORS[key]}
								rx="2"
							/>
							<text x={lx + 14} y={ly} fill="#d1d5db" font-size="11">
								{LEGEND_LABELS[key]}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}
