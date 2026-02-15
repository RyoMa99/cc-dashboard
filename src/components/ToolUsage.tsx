import type { ToolUsageRow } from "../queries/dashboard";
import { ToolUsageChart } from "./charts/ToolUsageChart";

export function ToolUsage({ tools }: { tools: ToolUsageRow[] }) {
	if (tools.length === 0) {
		return (
			<section>
				<h2 class="text-lg font-semibold mb-3">Tool Usage</h2>
				<p class="text-gray-400 text-sm">No tool usage data yet.</p>
			</section>
		);
	}

	return (
		<section>
			<h2 class="text-lg font-semibold mb-3">Tool Usage</h2>
			<ToolUsageChart tools={tools} />
			<div class="overflow-x-auto">
				<table class="w-full bg-gray-900 border border-gray-700 rounded-lg text-sm">
					<thead>
						<tr class="bg-gray-800 border-b border-gray-700">
							<th class="text-left px-4 py-2 font-medium">Tool</th>
							<th class="text-right px-4 py-2 font-medium">Calls</th>
							<th class="text-right px-4 py-2 font-medium">Success Rate</th>
							<th class="text-right px-4 py-2 font-medium">Avg Duration</th>
						</tr>
					</thead>
					<tbody>
						{tools.map((tool) => (
							<tr key={tool.toolName} class="border-b border-gray-800">
								<td class="px-4 py-2 font-mono">{tool.toolName}</td>
								<td class="px-4 py-2 text-right">{tool.callCount}</td>
								<td class="px-4 py-2 text-right">
									<span
										class={
											tool.successRate >= 95
												? "text-green-400"
												: tool.successRate >= 80
													? "text-yellow-400"
													: "text-red-400"
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
