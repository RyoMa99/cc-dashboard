import { formatCost, formatTokens } from "../lib/format";
import type { OverviewStats } from "../queries/dashboard";

function Card({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div class="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <p class="text-sm text-gray-400">{label}</p>
      <p class="text-2xl font-bold mt-1">{value}</p>
      {sub && <p class="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export function Overview({ stats }: { stats: OverviewStats }) {
  const totalTokens =
    stats.totalInputTokens +
    stats.totalOutputTokens +
    stats.totalCacheReadTokens +
    stats.totalCacheCreationTokens;

  return (
    <section>
      <h2 class="text-lg font-semibold mb-3">Overview</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Total Cost" value={formatCost(stats.totalCost)} />
        <Card
          label="Total Tokens"
          value={formatTokens(totalTokens)}
          sub={`In: ${formatTokens(stats.totalInputTokens)} / Out: ${formatTokens(stats.totalOutputTokens)}`}
        />
        <Card label="Sessions" value={String(stats.sessionCount)} />
        <Card
          label="API Calls"
          value={String(stats.apiCallCount)}
          sub={stats.errorCount > 0 ? `${stats.errorCount} errors` : undefined}
        />
      </div>
    </section>
  );
}
