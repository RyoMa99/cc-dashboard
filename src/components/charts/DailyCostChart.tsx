import type { DailyCostRow } from "../../queries/dashboard";
import {
	MAX_BAR_WIDTH,
	MODEL_COLORS,
	PADDING,
	calcDailyChartWidth,
	formatCostAxis,
	niceMax,
	scaleLinear,
} from "./chart-utils";

const HEIGHT = 320;

type DailyGroup = {
	date: string;
	segments: { model: string; cost: number; color: string }[];
	total: number;
};

function groupByDate(rows: DailyCostRow[]): {
	groups: DailyGroup[];
	models: string[];
} {
	const data = rows.slice().reverse(); // DESC → ASC
	const modelSet: string[] = [];
	const dateMap = new Map<string, { model: string; cost: number }[]>();

	for (const r of data) {
		if (!modelSet.includes(r.model)) modelSet.push(r.model);
		const existing = dateMap.get(r.date) ?? [];
		existing.push({ model: r.model, cost: r.cost });
		dateMap.set(r.date, existing);
	}

	const colorOf = (model: string) => {
		const idx = modelSet.indexOf(model);
		return MODEL_COLORS[Math.min(idx, MODEL_COLORS.length - 1)];
	};

	const groups: DailyGroup[] = [];
	for (const [date, items] of dateMap) {
		const segments = items.map((it) => ({
			model: it.model,
			cost: it.cost,
			color: colorOf(it.model),
		}));
		groups.push({
			date,
			segments,
			total: segments.reduce((s, x) => s + x.cost, 0),
		});
	}

	return { groups, models: modelSet };
}

export function DailyCostChart({
	rows,
}: { rows: DailyCostRow[] }): ReturnType<typeof Object> | null {
	if (rows.length === 0) return null;

	const { groups, models } = groupByDate(rows);
	const maxTotal = niceMax(Math.max(...groups.map((g) => g.total)));

	const width = calcDailyChartWidth(groups.length);
	const chartW = width - PADDING.left - PADDING.right;
	const chartH = HEIGHT - PADDING.top - PADDING.bottom;
	const barW = Math.min(
		Math.max(1, (chartW / groups.length) * 0.7),
		MAX_BAR_WIDTH,
	);
	const gap = (chartW / groups.length) * 0.3;

	const yScale = scaleLinear([0, maxTotal], [chartH, 0]);

	const gridLines = 4;
	const gridStep = maxTotal / gridLines;

	const labelInterval = Math.max(1, Math.ceil(groups.length / 12));

	return (
		<div class="mb-4 overflow-x-auto" style={`max-width:${width}px`}>
			<svg
				viewBox={`0 0 ${width} ${HEIGHT}`}
				width="100%"
				role="img"
				aria-label="Daily Costs Chart"
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
								{formatCostAxis(val)}
							</text>
						</g>
					);
				})}

				{/* 棒グラフ */}
				{groups.map((group, i) => {
					const x = PADDING.left + i * (barW + gap) + gap / 2;
					let cumY = chartH;
					const formatDate = group.date.slice(5);
					return (
						<g key={group.date}>
							{group.segments.map((seg) => {
								const barH = seg.cost > 0 ? (seg.cost / maxTotal) * chartH : 0;
								cumY -= barH;
								return (
									<rect
										key={seg.model}
										x={x}
										y={PADDING.top + cumY}
										width={barW}
										height={barH}
										fill={seg.color}
										rx="1"
									>
										<title>
											{group.date}: {seg.model} ${seg.cost.toFixed(4)}
										</title>
									</rect>
								);
							})}
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
				{models.slice(0, 5).map((model, i) => {
					const legendSpacing = Math.min(
						110,
						(width - PADDING.left - 20) / Math.min(models.length, 5),
					);
					const lx = PADDING.left + i * legendSpacing;
					const ly = HEIGHT - 12;
					const color = MODEL_COLORS[Math.min(i, MODEL_COLORS.length - 1)];
					return (
						<g key={`legend-${model}`}>
							<rect
								x={lx}
								y={ly - 8}
								width="10"
								height="10"
								fill={color}
								rx="2"
							/>
							<text x={lx + 14} y={ly} fill="#d1d5db" font-size="10">
								{model.length > 14 ? `${model.slice(0, 14)}…` : model}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}
