import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { ParsedMetricDataPoint } from "../types/domain";
import { insertMetricDataPoints } from "./metrics";

function makeMetricDataPoint(
	overrides?: Partial<ParsedMetricDataPoint>,
): ParsedMetricDataPoint {
	return {
		sessionId: "session-1",
		metricName: "token_usage",
		value: 42.5,
		timestampNs: "1700000000000000000",
		timestampMs: 1700000000000,
		attrType: "input",
		attrModel: "claude-sonnet-4-5-20250929",
		attributesJson: '{"type":"input","model":"claude-sonnet-4-5-20250929"}',
		...overrides,
	};
}

describe("insertMetricDataPoints", () => {
	it("1件を挿入し全カラムの値が一致する", async () => {
		const point = makeMetricDataPoint();
		await insertMetricDataPoints(env.DB, [point]);

		const row = await env.DB.prepare(
			"SELECT * FROM metric_data_points WHERE session_id = ?",
		)
			.bind("session-1")
			.first();

		expect(row).not.toBeNull();
		expect(row?.session_id).toBe("session-1");
		expect(row?.metric_name).toBe("token_usage");
		expect(row?.value).toBe(42.5);
		expect(row?.timestamp_ns).toBe("1700000000000000000");
		expect(row?.timestamp_ms).toBe(1700000000000);
		expect(row?.attr_type).toBe("input");
		expect(row?.attr_model).toBe("claude-sonnet-4-5-20250929");
		expect(row?.attributes_json).toBe(
			'{"type":"input","model":"claude-sonnet-4-5-20250929"}',
		);
	});

	it("nullable フィールドが null の場合 NULL として保存される", async () => {
		const point = makeMetricDataPoint({
			sessionId: null,
			attrType: null,
			attrModel: null,
			attributesJson: null,
		});
		await insertMetricDataPoints(env.DB, [point]);

		const row = await env.DB.prepare(
			"SELECT * FROM metric_data_points WHERE metric_name = ? AND session_id IS NULL",
		)
			.bind("token_usage")
			.first();

		expect(row).not.toBeNull();
		expect(row?.session_id).toBeNull();
		expect(row?.attr_type).toBeNull();
		expect(row?.attr_model).toBeNull();
		expect(row?.attributes_json).toBeNull();
	});

	it("空配列を渡すと正常終了する", async () => {
		await expect(insertMetricDataPoints(env.DB, [])).resolves.toBeUndefined();
	});
});
