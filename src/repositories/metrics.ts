import type { ParsedMetricDataPoint } from "../types/domain";

export async function insertMetricDataPoints(
  db: D1Database,
  points: ParsedMetricDataPoint[],
): Promise<void> {
  if (points.length === 0) return;

  const stmt = db.prepare(
    `INSERT INTO metric_data_points
			(session_id, metric_name, value, timestamp_ns, timestamp_ms, attr_type, attr_model, attributes_json)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  await db.batch(
    points.map((p) =>
      stmt.bind(
        p.sessionId,
        p.metricName,
        p.value,
        p.timestampNs,
        p.timestampMs,
        p.attrType,
        p.attrModel,
        p.attributesJson,
      ),
    ),
  );
}
