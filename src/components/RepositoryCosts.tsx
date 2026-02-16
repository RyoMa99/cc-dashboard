import { formatCost } from "../lib/format";
import type { RepositoryCostRow } from "../queries/dashboard";
import { RepositoryCostChart } from "./charts/RepositoryCostChart";

export function RepositoryCosts({ rows }: { rows: RepositoryCostRow[] }) {
	if (rows.length === 0) {
		return (
			<section>
				<h2 class="text-lg font-semibold mb-3">Cost by Repository</h2>
				<p class="text-gray-400 text-sm">No repository cost data yet.</p>
			</section>
		);
	}

	return (
		<section>
			<h2 class="text-lg font-semibold mb-3">Cost by Repository</h2>
			<RepositoryCostChart rows={rows} />
			<div class="overflow-x-auto">
				<table class="w-full bg-gray-900 border border-gray-700 rounded-lg text-sm">
					<thead>
						<tr class="bg-gray-800 border-b border-gray-700">
							<th class="text-left px-4 py-2 font-medium">Repository</th>
							<th class="text-right px-4 py-2 font-medium">Cost</th>
							<th class="text-right px-4 py-2 font-medium">Sessions</th>
							<th class="text-right px-4 py-2 font-medium">API Calls</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => (
							<tr key={row.repository} class="border-b border-gray-800">
								<td class="px-4 py-2">
									{row.repository === "未分類" ? (
										<span class="text-gray-500">{row.repository}</span>
									) : (
										row.repository
									)}
								</td>
								<td class="px-4 py-2 text-right tabular-nums">
									{formatCost(row.totalCost)}
								</td>
								<td class="px-4 py-2 text-right tabular-nums">
									{row.sessionCount}
								</td>
								<td class="px-4 py-2 text-right tabular-nums">
									{row.apiCallCount}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
