import { describe, expect, it } from "vitest";
import {
	formatCost,
	formatDuration,
	formatDurationMs,
	formatTime,
	formatTokens,
} from "./format";

describe("formatCost", () => {
	it("小数第4位まで表示する", () => {
		expect(formatCost(0.0123)).toBe("$0.0123");
	});

	it("0の場合", () => {
		expect(formatCost(0)).toBe("$0.0000");
	});

	it("大きな値も正しくフォーマットする", () => {
		expect(formatCost(1.5)).toBe("$1.5000");
	});
});

describe("formatTokens", () => {
	it("100万以上は M 表記", () => {
		expect(formatTokens(1_500_000)).toBe("1.5M");
	});

	it("1000以上は K 表記", () => {
		expect(formatTokens(1500)).toBe("1.5K");
	});

	it("1000未満はそのまま", () => {
		expect(formatTokens(999)).toBe("999");
	});

	it("0の場合", () => {
		expect(formatTokens(0)).toBe("0");
	});
});

describe("formatTime", () => {
	it("ISO形式の日時を空白区切りで表示する", () => {
		const ms = new Date("2025-01-15T12:00:00Z").getTime();
		expect(formatTime(ms)).toBe("2025-01-15 12:00:00");
	});
});

describe("formatDuration", () => {
	it("60秒未満は秒表示", () => {
		const first = 1000;
		const last = 31000;
		expect(formatDuration(first, last)).toBe("30s");
	});

	it("60秒以上は分表示", () => {
		const first = 0;
		const last = 120_000;
		expect(formatDuration(first, last)).toBe("2m");
	});

	it("60分以上は時間表示", () => {
		const first = 0;
		const last = 3_600_000;
		expect(formatDuration(first, last)).toBe("1.0h");
	});
});

describe("formatDurationMs", () => {
	it("1000ms以上は秒表示", () => {
		expect(formatDurationMs(1500)).toBe("1.5s");
	});

	it("1000ms未満はms表示", () => {
		expect(formatDurationMs(150)).toBe("150ms");
	});

	it("0の場合", () => {
		expect(formatDurationMs(0)).toBe("0ms");
	});
});
