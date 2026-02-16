import { formatCost } from "../../lib/format";
import type { RepositoryCostRow } from "../../queries/dashboard";
import { BAR_COLOR } from "./chart-utils";

const WIDTH = 600;
const ROW_HEIGHT = 30;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 10;
const LABEL_WIDTH = 160;
const BAR_LEFT = 170;
const BAR_MAX_WIDTH = 380;
const VALUE_OFFSET = 10;

export function RepositoryCostChart({
	rows,
}: { rows: RepositoryCostRow[] }): ReturnType<typeof Object> | null {
	if (rows.length === 0) return null;

	const sorted = rows.slice().sort((a, b) => b.totalCost - a.totalCost);
	const maxCost = Math.max(...sorted.map((r) => r.totalCost));
	const height = PADDING_TOP + sorted.length * ROW_HEIGHT + PADDING_BOTTOM;

	return (
		<div class="mb-4 overflow-x-auto">
			<svg
				viewBox={`0 0 ${WIDTH} ${height}`}
				width="100%"
				role="img"
				aria-label="Repository Cost Chart"
			>
				{sorted.map((row, i) => {
					const y = PADDING_TOP + i * ROW_HEIGHT;
					const barW =
						maxCost > 0 ? (row.totalCost / maxCost) * BAR_MAX_WIDTH : 0;
					return (
						<g key={row.repository}>
							<text
								x={LABEL_WIDTH}
								y={y + ROW_HEIGHT / 2}
								fill="#d1d5db"
								font-size="11"
								text-anchor="end"
								dominant-baseline="middle"
							>
								{row.repository.length > 22
									? `${row.repository.slice(0, 22)}…`
									: row.repository}
							</text>
							<rect
								x={BAR_LEFT}
								y={y + 6}
								width={Math.max(barW, 1)}
								height={ROW_HEIGHT - 12}
								fill={BAR_COLOR}
								rx="3"
							>
								<title>
									{row.repository}: {formatCost(row.totalCost)},{" "}
									{row.sessionCount} sessions, {row.apiCallCount} API calls
								</title>
							</rect>
							<text
								x={BAR_LEFT + barW + VALUE_OFFSET}
								y={y + ROW_HEIGHT / 2}
								fill="#9ca3af"
								font-size="11"
								dominant-baseline="middle"
							>
								{formatCost(row.totalCost)}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}
