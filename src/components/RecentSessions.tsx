import type { SessionRow } from "../queries/dashboard";

function formatCost(usd: number): string {
	return `$${usd.toFixed(4)}`;
}

function formatTokens(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return String(n);
}

function formatTime(ms: number): string {
	const d = new Date(ms);
	return d.toISOString().replace("T", " ").slice(0, 19);
}

function formatDuration(firstMs: number, lastMs: number): string {
	const diff = lastMs - firstMs;
	if (diff < 60_000) return `${Math.round(diff / 1000)}s`;
	if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
	return `${(diff / 3_600_000).toFixed(1)}h`;
}

export function RecentSessions({ sessions }: { sessions: SessionRow[] }) {
	if (sessions.length === 0) {
		return (
			<section>
				<h2 class="text-lg font-semibold mb-3">Recent Sessions</h2>
				<p class="text-gray-400 text-sm">No sessions yet.</p>
			</section>
		);
	}

	return (
		<section>
			<h2 class="text-lg font-semibold mb-3">Recent Sessions</h2>
			<div class="overflow-x-auto">
				<table class="w-full bg-gray-900 border border-gray-700 rounded-lg text-sm">
					<thead>
						<tr class="bg-gray-800 border-b border-gray-700">
							<th class="text-left px-4 py-2 font-medium">Session ID</th>
							<th class="text-right px-4 py-2 font-medium">Cost</th>
							<th class="text-right px-4 py-2 font-medium">Tokens</th>
							<th class="text-right px-4 py-2 font-medium">API Calls</th>
							<th class="text-right px-4 py-2 font-medium">Tool Calls</th>
							<th class="text-right px-4 py-2 font-medium">Duration</th>
							<th class="text-right px-4 py-2 font-medium">Last Active</th>
						</tr>
					</thead>
					<tbody>
						{sessions.map((s) => (
							<tr key={s.sessionId} class="border-b border-gray-800">
								<td class="px-4 py-2 font-mono text-xs max-w-[200px] truncate">
									{s.sessionId}
								</td>
								<td class="px-4 py-2 text-right">{formatCost(s.totalCost)}</td>
								<td class="px-4 py-2 text-right">
									{formatTokens(s.totalTokens)}
								</td>
								<td class="px-4 py-2 text-right">{s.apiCalls}</td>
								<td class="px-4 py-2 text-right">{s.toolCalls}</td>
								<td class="px-4 py-2 text-right">
									{formatDuration(s.firstSeen, s.lastSeen)}
								</td>
								<td class="px-4 py-2 text-right text-xs text-gray-400">
									{formatTime(s.lastSeen)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
