export function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function formatTime(ms: number): string {
  const d = new Date(ms + JST_OFFSET_MS);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export function formatDuration(firstMs: number, lastMs: number): string {
  const diff = lastMs - firstMs;
  if (diff < 60_000) return `${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
  return `${(diff / 3_600_000).toFixed(1)}h`;
}

export function formatPercent(ratio: number): string {
  if (Number.isNaN(ratio)) return "N/A";
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatCostPerToken(costPerToken: number): string {
  if (Number.isNaN(costPerToken)) return "N/A";
  const per1K = costPerToken * 1000;
  return `$${per1K.toFixed(2)} / 1K tokens`;
}

export function formatDurationMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}
