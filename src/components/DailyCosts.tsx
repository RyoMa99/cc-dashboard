import type { DailyCostRow } from "../queries/dashboard";

function formatCost(usd: number): string {
	return `$${usd.toFixed(4)}`;
}

export function DailyCosts({ rows }: { rows: DailyCostRow[] }) {
	if (rows.length === 0) {
		return (
			<section>
				<h2 class="text-lg font-semibold mb-3">Daily Costs by Model</h2>
				<p class="text-gray-500 text-sm">No cost data yet.</p>
			</section>
		);
	}

	return (
		<section>
			<h2 class="text-lg font-semibold mb-3">Daily Costs by Model</h2>
			<div class="overflow-x-auto">
				<table class="w-full bg-white border border-gray-200 rounded-lg text-sm">
					<thead>
						<tr class="bg-gray-50 border-b border-gray-200">
							<th class="text-left px-4 py-2 font-medium">Date</th>
							<th class="text-left px-4 py-2 font-medium">Model</th>
							<th class="text-right px-4 py-2 font-medium">Cost</th>
							<th class="text-right px-4 py-2 font-medium">Calls</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((r) => (
							<tr key={`${r.date}-${r.model}`} class="border-b border-gray-100">
								<td class="px-4 py-2">{r.date}</td>
								<td class="px-4 py-2 font-mono text-xs">{r.model}</td>
								<td class="px-4 py-2 text-right">{formatCost(r.cost)}</td>
								<td class="px-4 py-2 text-right">{r.calls}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
