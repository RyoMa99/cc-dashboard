import {
	formatCost,
	formatDuration,
	formatTime,
	formatTokens,
} from "../lib/format";
import type { SessionRow } from "../queries/dashboard";

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
									<a
										href={`/session/${s.sessionId}`}
										class="text-blue-400 hover:text-blue-300 hover:underline"
									>
										{s.sessionId}
									</a>
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
