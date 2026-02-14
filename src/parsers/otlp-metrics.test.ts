import { describe, expect, it } from "vitest";
import type { ExportMetricsServiceRequest } from "../types/otlp";
import { parseMetricsPayload } from "./otlp-metrics";

describe("parseMetricsPayload", () => {
	it("Sum メトリクスをパースする", () => {
		const payload: ExportMetricsServiceRequest = {
			resourceMetrics: [
				{
					resource: {
						attributes: [
							{ key: "session.id", value: { stringValue: "sess-001" } },
						],
					},
					scopeMetrics: [
						{
							metrics: [
								{
									name: "claude_code.token.usage",
									unit: "tokens",
									sum: {
										dataPoints: [
											{
												attributes: [
													{ key: "type", value: { stringValue: "input" } },
													{
														key: "model",
														value: {
															stringValue: "claude-sonnet-4-5-20250929",
														},
													},
												],
												timeUnixNano: "1700000000000000000",
												asInt: "1500",
											},
										],
										isMonotonic: true,
									},
								},
							],
						},
					],
				},
			],
		};

		const points = parseMetricsPayload(payload);
		expect(points).toHaveLength(1);
		expect(points[0].metricName).toBe("claude_code.token.usage");
		expect(points[0].value).toBe(1500);
		expect(points[0].sessionId).toBe("sess-001");
		expect(points[0].attrType).toBe("input");
		expect(points[0].attrModel).toBe("claude-sonnet-4-5-20250929");
		expect(points[0].timestampMs).toBe(1700000000000);
	});

	it("Gauge メトリクスをパースする", () => {
		const payload: ExportMetricsServiceRequest = {
			resourceMetrics: [
				{
					scopeMetrics: [
						{
							metrics: [
								{
									name: "claude_code.active_time.total",
									gauge: {
										dataPoints: [
											{
												timeUnixNano: "1700000000000000000",
												asDouble: 120.5,
											},
										],
									},
								},
							],
						},
					],
				},
			],
		};

		const points = parseMetricsPayload(payload);
		expect(points).toHaveLength(1);
		expect(points[0].metricName).toBe("claude_code.active_time.total");
		expect(points[0].value).toBe(120.5);
		expect(points[0].sessionId).toBeNull();
	});

	it("複数メトリクス・複数 dataPoints をパースする", () => {
		const payload: ExportMetricsServiceRequest = {
			resourceMetrics: [
				{
					scopeMetrics: [
						{
							metrics: [
								{
									name: "claude_code.token.usage",
									sum: {
										dataPoints: [
											{
												attributes: [
													{ key: "type", value: { stringValue: "input" } },
												],
												timeUnixNano: "1700000000000000000",
												asInt: 100,
											},
											{
												attributes: [
													{ key: "type", value: { stringValue: "output" } },
												],
												timeUnixNano: "1700000000000000000",
												asInt: 200,
											},
										],
									},
								},
								{
									name: "claude_code.cost.usage",
									sum: {
										dataPoints: [
											{
												timeUnixNano: "1700000000000000000",
												asDouble: 0.05,
											},
										],
									},
								},
							],
						},
					],
				},
			],
		};

		const points = parseMetricsPayload(payload);
		expect(points).toHaveLength(3);

		const tokenInput = points.find((p) => p.attrType === "input");
		expect(tokenInput?.value).toBe(100);

		const tokenOutput = points.find((p) => p.attrType === "output");
		expect(tokenOutput?.value).toBe(200);

		const cost = points.find((p) => p.metricName === "claude_code.cost.usage");
		expect(cost?.value).toBe(0.05);
	});

	it("空のペイロードは空配列を返す", () => {
		expect(parseMetricsPayload({})).toEqual([]);
		expect(parseMetricsPayload({ resourceMetrics: [] })).toEqual([]);
	});

	it("type, model 以外の属性は attributesJson に格納する", () => {
		const payload: ExportMetricsServiceRequest = {
			resourceMetrics: [
				{
					scopeMetrics: [
						{
							metrics: [
								{
									name: "claude_code.session.count",
									sum: {
										dataPoints: [
											{
												attributes: [
													{
														key: "terminal.type",
														value: { stringValue: "vscode" },
													},
												],
												timeUnixNano: "1700000000000000000",
												asInt: 1,
											},
										],
									},
								},
							],
						},
					],
				},
			],
		};

		const points = parseMetricsPayload(payload);
		expect(points[0].attributesJson).not.toBeNull();
		// biome-ignore lint/style/noNonNullAssertion: assert above guarantees non-null
		const parsed = JSON.parse(points[0].attributesJson!);
		expect(parsed).toHaveLength(1);
		expect(parsed[0].key).toBe("terminal.type");
	});
});
