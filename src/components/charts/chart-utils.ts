// チャート共有ユーティリティ
// SSR SVG チャートで使用するスケーリング、フォーマット、色定数

export function scaleLinear(
	domain: [number, number],
	range: [number, number],
): (value: number) => number {
	const [d0, d1] = domain;
	const [r0, r1] = range;
	const domainSpan = d1 - d0;
	if (domainSpan === 0) return () => r0;
	return (value: number) => r0 + ((value - d0) / domainSpan) * (r1 - r0);
}

export function niceMax(value: number): number {
	if (value <= 0) return 1;
	const magnitude = 10 ** Math.floor(Math.log10(value));
	const normalized = value / magnitude;
	const niceValues = [1, 1.5, 2, 3, 4, 5, 6, 8, 10];
	for (const nice of niceValues) {
		if (nice >= normalized) return nice * magnitude;
	}
	return 10 * magnitude;
}

export function formatCompact(n: number): string {
	if (n === 0) return "0";
	if (n >= 1_000_000)
		return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
	return String(n);
}

export function formatCostAxis(usd: number): string {
	return `$${usd.toFixed(2)}`;
}

export const MODEL_COLORS = [
	"#60a5fa", // blue-400
	"#34d399", // emerald-400
	"#fbbf24", // amber-400
	"#f87171", // red-400
	"#a78bfa", // violet-400
];

export const TOKEN_COLORS: Record<
	"input" | "output" | "cacheRead" | "cacheCreate",
	string
> = {
	input: "#60a5fa", // blue-400
	output: "#34d399", // emerald-400
	cacheRead: "#fbbf24", // amber-400
	cacheCreate: "#a78bfa", // violet-400
};

export const BAR_COLOR = "#60a5fa"; // blue-400

export const PADDING = {
	top: 20,
	right: 20,
	bottom: 60,
	left: 55,
	legend: 25,
};
