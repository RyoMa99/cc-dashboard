import type { DailyTokenRow } from "../queries/dashboard";

function formatTokens(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return String(n);
}

export function DailyTokens({ rows }: { rows: DailyTokenRow[] }) {
	if (rows.length === 0) {
		return (
			<section>
				<h2 class="text-lg font-semibold mb-3">Daily Token Usage</h2>
				<p class="text-gray-500 text-sm">No token data yet.</p>
			</section>
		);
	}

	return (
		<section>
			<h2 class="text-lg font-semibold mb-3">Daily Token Usage</h2>
			<div class="overflow-x-auto">
				<table class="w-full bg-white border border-gray-200 rounded-lg text-sm">
					<thead>
						<tr class="bg-gray-50 border-b border-gray-200">
							<th class="text-left px-4 py-2 font-medium">Date</th>
							<th class="text-right px-4 py-2 font-medium">Input</th>
							<th class="text-right px-4 py-2 font-medium">Output</th>
							<th class="text-right px-4 py-2 font-medium">Cache Read</th>
							<th class="text-right px-4 py-2 font-medium">Cache Create</th>
							<th class="text-right px-4 py-2 font-medium">Total</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((r) => {
							const total =
								r.inputTokens +
								r.outputTokens +
								r.cacheReadTokens +
								r.cacheCreationTokens;
							return (
								<tr key={r.date} class="border-b border-gray-100">
									<td class="px-4 py-2">{r.date}</td>
									<td class="px-4 py-2 text-right">
										{formatTokens(r.inputTokens)}
									</td>
									<td class="px-4 py-2 text-right">
										{formatTokens(r.outputTokens)}
									</td>
									<td class="px-4 py-2 text-right">
										{formatTokens(r.cacheReadTokens)}
									</td>
									<td class="px-4 py-2 text-right">
										{formatTokens(r.cacheCreationTokens)}
									</td>
									<td class="px-4 py-2 text-right font-medium">
										{formatTokens(total)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</section>
	);
}
