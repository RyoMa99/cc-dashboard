import { formatCost, formatPercent, formatTokens } from "../lib/format";
import type { LinesOfCodeStats, OverviewStats } from "../queries/dashboard";

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

function computeROISub(
  linesAdded: number,
  totalCost: number,
): string | undefined {
  if (linesAdded <= 0) return undefined;
  const costPerLine = totalCost / linesAdded;
  return `$${costPerLine.toFixed(2)} / line`;
}

export function Overview({
  stats,
  linesOfCode,
}: {
  stats: OverviewStats;
  linesOfCode?: LinesOfCodeStats;
}) {
  const totalTokens =
    stats.totalInputTokens +
    stats.totalOutputTokens +
    stats.totalCacheReadTokens +
    stats.totalCacheCreationTokens;

  const cacheHitRate =
    stats.totalInputTokens > 0
      ? stats.totalCacheReadTokens / stats.totalInputTokens
      : Number.NaN;

  const roiSub = linesOfCode
    ? computeROISub(linesOfCode.linesAdded, stats.totalCost)
    : undefined;

  return (
    <section>
      <h2 class="text-lg font-semibold mb-3">Overview</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
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
        <Card
          label="Cache Hit Rate"
          value={formatPercent(cacheHitRate)}
          sub={`${formatTokens(stats.totalCacheReadTokens)} cache read tokens`}
        />
        {linesOfCode && (
          <Card
            label="Lines Changed"
            value={`+${linesOfCode.linesAdded} / -${linesOfCode.linesRemoved}`}
            sub={roiSub}
          />
        )}
      </div>
    </section>
  );
}
