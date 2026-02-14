import { Hono } from "hono";
import { bearerAuth } from "../middleware/auth";
import { parseLogsPayload } from "../parsers/otlp-logs";
import { parseMetricsPayload } from "../parsers/otlp-metrics";
import {
	insertApiErrors,
	insertApiRequests,
	insertToolResults,
} from "../repositories/events";
import { insertMetricDataPoints } from "../repositories/metrics";
import type { Bindings } from "../types/env";
import type {
	ExportLogsServiceRequest,
	ExportMetricsServiceRequest,
} from "../types/otlp";

const otlp = new Hono<{ Bindings: Bindings }>();

otlp.use("/v1/*", bearerAuth);

otlp.post("/v1/logs", async (c) => {
	const body = await c.req.json<ExportLogsServiceRequest>();
	const events = parseLogsPayload(body);

	const apiRequests = events.flatMap((e) =>
		e.type === "api_request" ? [e.data] : [],
	);
	const toolResults = events.flatMap((e) =>
		e.type === "tool_result" ? [e.data] : [],
	);
	const apiErrors = events.flatMap((e) =>
		e.type === "api_error" ? [e.data] : [],
	);

	await Promise.all([
		insertApiRequests(c.env.DB, apiRequests),
		insertToolResults(c.env.DB, toolResults),
		insertApiErrors(c.env.DB, apiErrors),
	]);

	return c.json({ partialSuccess: {} });
});

otlp.post("/v1/metrics", async (c) => {
	const body = await c.req.json<ExportMetricsServiceRequest>();
	const points = parseMetricsPayload(body);

	await insertMetricDataPoints(c.env.DB, points);

	return c.json({ partialSuccess: {} });
});

export { otlp };
