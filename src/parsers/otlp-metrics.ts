import type { ParsedMetricDataPoint } from "../types/domain";
import type {
	ExportMetricsServiceRequest,
	KeyValue,
	NumberDataPoint,
} from "../types/otlp";
import { getStringAttr } from "./otlp-logs";

export function parseMetricsPayload(
	payload: ExportMetricsServiceRequest,
): ParsedMetricDataPoint[] {
	const points: ParsedMetricDataPoint[] = [];

	for (const rm of payload.resourceMetrics ?? []) {
		const resourceAttrs = rm.resource?.attributes ?? [];
		for (const sm of rm.scopeMetrics ?? []) {
			for (const metric of sm.metrics ?? []) {
				const name = metric.name ?? "unknown";
				const dataPoints =
					metric.sum?.dataPoints ?? metric.gauge?.dataPoints ?? [];
				for (const dp of dataPoints) {
					const parsed = parseDataPoint(dp, name, resourceAttrs);
					if (parsed) {
						points.push(parsed);
					}
				}
			}
		}
	}

	return points;
}

function parseDataPoint(
	dp: NumberDataPoint,
	metricName: string,
	resourceAttrs: KeyValue[],
): ParsedMetricDataPoint | null {
	const value = dp.asDouble ?? (dp.asInt != null ? Number(dp.asInt) : null);
	if (value == null) return null;

	const attrs = dp.attributes ?? [];
	const timestampNs = dp.timeUnixNano ?? "0";
	const timestampMs = nsToMs(timestampNs);

	const sessionId =
		getStringAttr(attrs, "session.id") ??
		getStringAttr(resourceAttrs, "session.id");

	const attrType = getStringAttr(attrs, "type");
	const attrModel = getStringAttr(attrs, "model");

	// type, model, session.id 以外の属性を JSON に格納
	const extraAttrs = attrs.filter(
		(a) => a.key !== "type" && a.key !== "model" && a.key !== "session.id",
	);
	const attributesJson =
		extraAttrs.length > 0 ? JSON.stringify(extraAttrs) : null;

	return {
		sessionId,
		metricName,
		value,
		timestampNs,
		timestampMs,
		attrType,
		attrModel,
		attributesJson,
	};
}

function nsToMs(ns: string): number {
	const n = BigInt(ns);
	return Number(n / 1000000n);
}
