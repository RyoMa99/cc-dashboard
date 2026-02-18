import { formatCost } from "../lib/format";
import type { DailyCostRow } from "../queries/dashboard";
import { DailyCostChart } from "./charts/DailyCostChart";

export function DailyCosts({ rows }: { rows: DailyCostRow[] }) {
  if (rows.length === 0) {
    return (
      <section>
        <h2 class="text-lg font-semibold mb-3">Daily Costs by Model</h2>
        <p class="text-gray-400 text-sm">No cost data yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 class="text-lg font-semibold mb-3">Daily Costs by Model</h2>
      <DailyCostChart rows={rows} />
      <div class="overflow-x-auto">
        <table class="w-full bg-gray-900 border border-gray-700 rounded-lg text-sm">
          <thead>
            <tr class="bg-gray-800 border-b border-gray-700">
              <th class="text-left px-4 py-2 font-medium">Date</th>
              <th class="text-left px-4 py-2 font-medium">Model</th>
              <th class="text-right px-4 py-2 font-medium">Cost</th>
              <th class="text-right px-4 py-2 font-medium">Calls</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.date}-${r.model}`} class="border-b border-gray-800">
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
