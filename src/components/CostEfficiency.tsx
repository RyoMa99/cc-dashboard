import { formatCost, formatCostPerToken, formatTokens } from "../lib/format";
import type { CostEfficiencyRow } from "../queries/dashboard";

export function CostEfficiency({ rows }: { rows: CostEfficiencyRow[] }) {
  if (rows.length === 0) {
    return (
      <section>
        <h2 class="text-lg font-semibold mb-3">Cost Efficiency by Model</h2>
        <p class="text-gray-400 text-sm">No cost efficiency data yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 class="text-lg font-semibold mb-3">Cost Efficiency by Model</h2>
      <div class="overflow-x-auto">
        <table class="w-full bg-gray-900 border border-gray-700 rounded-lg text-sm">
          <thead>
            <tr class="bg-gray-800 border-b border-gray-700">
              <th class="text-left px-4 py-2 font-medium">Model</th>
              <th class="text-right px-4 py-2 font-medium">Cost</th>
              <th class="text-right px-4 py-2 font-medium">Output Tokens</th>
              <th class="text-right px-4 py-2 font-medium">Cost / 1K tokens</th>
              <th class="text-right px-4 py-2 font-medium">API Calls</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.model} class="border-b border-gray-800">
                <td class="px-4 py-2 font-mono text-xs">{row.model}</td>
                <td class="px-4 py-2 text-right tabular-nums">
                  {formatCost(row.totalCost)}
                </td>
                <td class="px-4 py-2 text-right tabular-nums">
                  {formatTokens(row.totalOutputTokens)}
                </td>
                <td class="px-4 py-2 text-right tabular-nums">
                  {formatCostPerToken(row.costPerOutputToken)}
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
