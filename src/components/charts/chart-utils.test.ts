import { describe, expect, it } from "vitest";
import {
  formatCompact,
  formatCostAxis,
  niceMax,
  scaleLinear,
} from "./chart-utils";

describe("scaleLinear", () => {
  it("線形スケール: 中間値", () => {
    expect(scaleLinear([0, 100], [0, 200])(50)).toBe(100);
  });

  it("Y軸反転: domain 0 → range 200", () => {
    expect(scaleLinear([0, 100], [200, 0])(0)).toBe(200);
  });

  it("Y軸反転: domain 100 → range 0", () => {
    expect(scaleLinear([0, 100], [200, 0])(100)).toBe(0);
  });

  it("domain が 0 幅の場合 range の開始値を返す", () => {
    expect(scaleLinear([5, 5], [0, 200])(5)).toBe(0);
  });
});

describe("niceMax", () => {
  it("0 の場合は 1 を返す（ゼロ除算回避）", () => {
    expect(niceMax(0)).toBe(1);
  });

  it("負の値の場合は 1 を返す", () => {
    expect(niceMax(-5)).toBe(1);
  });

  it("73 → 80", () => {
    expect(niceMax(73)).toBe(80);
  });

  it("100 → 100", () => {
    expect(niceMax(100)).toBe(100);
  });

  it("小数対応: 0.0073 → 0.008", () => {
    expect(niceMax(0.0073)).toBe(0.008);
  });

  it("1500 → 1500", () => {
    expect(niceMax(1500)).toBe(1500);
  });

  it("250000 → 300000", () => {
    expect(niceMax(250000)).toBe(300000);
  });
});

describe("formatCompact", () => {
  it("0 → '0'", () => {
    expect(formatCompact(0)).toBe("0");
  });

  it("999 → '999'", () => {
    expect(formatCompact(999)).toBe("999");
  });

  it("1500 → '1.5K'", () => {
    expect(formatCompact(1500)).toBe("1.5K");
  });

  it("1000 → '1K'（小数なし）", () => {
    expect(formatCompact(1000)).toBe("1K");
  });

  it("2500000 → '2.5M'", () => {
    expect(formatCompact(2500000)).toBe("2.5M");
  });

  it("1000000 → '1M'（小数なし）", () => {
    expect(formatCompact(1000000)).toBe("1M");
  });
});

describe("formatCostAxis", () => {
  it("0.5 → '$0.50'", () => {
    expect(formatCostAxis(0.5)).toBe("$0.50");
  });

  it("0 → '$0.00'", () => {
    expect(formatCostAxis(0)).toBe("$0.00");
  });

  it("1.234 → '$1.23'", () => {
    expect(formatCostAxis(1.234)).toBe("$1.23");
  });
});
