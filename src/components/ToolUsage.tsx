import type { ToolUsageRow } from "../queries/dashboard";

export function ToolUsage({ tools }: { tools: ToolUsageRow[] }) {
	if (tools.length === 0) {
		return (
			<section>
				<h2 class="text-lg font-semibold mb-3">Tool Usage</h2>
				<p class="text-gray-500 text-sm">No tool usage data yet.</p>
			</section>
		);
	}

	return (
		<section>
			<h2 class="text-lg font-semibold mb-3">Tool Usage</h2>
			<div class="overflow-x-auto">
				<table class="w-full bg-white border border-gray-200 rounded-lg text-sm">
					<thead>
						<tr class="bg-gray-50 border-b border-gray-200">
							<th class="text-left px-4 py-2 font-medium">Tool</th>
							<th class="text-right px-4 py-2 font-medium">Calls</th>
							<th class="text-right px-4 py-2 font-medium">Success Rate</th>
							<th class="text-right px-4 py-2 font-medium">Avg Duration</th>
						</tr>
					</thead>
					<tbody>
						{tools.map((tool) => (
							<tr key={tool.toolName} class="border-b border-gray-100">
								<td class="px-4 py-2 font-mono">{tool.toolName}</td>
								<td class="px-4 py-2 text-right">{tool.callCount}</td>
								<td class="px-4 py-2 text-right">
									<span
										class={
											tool.successRate >= 95
												? "text-green-600"
												: tool.successRate >= 80
													? "text-yellow-600"
													: "text-red-600"
										}
									>
										{tool.successRate}%
									</span>
								</td>
								<td class="px-4 py-2 text-right">{tool.avgDurationMs}ms</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
