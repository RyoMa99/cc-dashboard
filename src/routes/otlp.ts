import { Hono } from "hono";
import { bearerAuth } from "../middleware/auth";
import { parseLogsPayload } from "../parsers/otlp-logs";
import { parseMetricsPayload } from "../parsers/otlp-metrics";
import {
	type SessionUpsertData,
	insertApiErrors,
	insertApiRequests,
	insertToolDecisions,
	insertToolResults,
	insertUserPrompts,
	upsertSessions,
} from "../repositories/events";
import { insertMetricDataPoints } from "../repositories/metrics";
import type { ParsedLogEvent, ParsedResourceContext } from "../types/domain";
import type { Bindings } from "../types/env";
import type {
	ExportLogsServiceRequest,
	ExportMetricsServiceRequest,
} from "../types/otlp";

const otlp = new Hono<{ Bindings: Bindings }>();

otlp.use("/v1/*", bearerAuth);

otlp.post("/v1/logs", async (c) => {
	const body = await c.req.json<ExportLogsServiceRequest>();
	const { events, resourceContexts } = parseLogsPayload(body);

	const apiRequests = events.flatMap((e) =>
		e.type === "api_request" ? [e.data] : [],
	);
	const toolResults = events.flatMap((e) =>
		e.type === "tool_result" ? [e.data] : [],
	);
	const apiErrors = events.flatMap((e) =>
		e.type === "api_error" ? [e.data] : [],
	);
	const userPrompts = events.flatMap((e) =>
		e.type === "user_prompt" ? [e.data] : [],
	);
	const toolDecisions = events.flatMap((e) =>
		e.type === "tool_decision" ? [e.data] : [],
	);

	const sessionUpserts = buildSessionUpserts(events, resourceContexts);

	await Promise.all([
		insertApiRequests(c.env.DB, apiRequests),
		insertToolResults(c.env.DB, toolResults),
		insertApiErrors(c.env.DB, apiErrors),
		insertUserPrompts(c.env.DB, userPrompts),
		insertToolDecisions(c.env.DB, toolDecisions),
		upsertSessions(c.env.DB, sessionUpserts),
	]);

	return c.json({ partialSuccess: {} });
});

otlp.post("/v1/metrics", async (c) => {
	const body = await c.req.json<ExportMetricsServiceRequest>();
	const points = parseMetricsPayload(body);

	await insertMetricDataPoints(c.env.DB, points);

	return c.json({ partialSuccess: {} });
});

function buildSessionUpserts(
	events: ParsedLogEvent[],
	resourceContexts: ParsedResourceContext[],
): SessionUpsertData[] {
	const repoBySession = new Map<string, string | null>();
	for (const ctx of resourceContexts) {
		const existing = repoBySession.get(ctx.sessionId);
		repoBySession.set(ctx.sessionId, ctx.repository ?? existing ?? null);
	}

	const sessionMap = new Map<
		string,
		{ repository: string | null; timestampMs: number }
	>();

	for (const event of events) {
		if (event.type === "unknown") continue;
		const { sessionId, timestampMs } = event.data;
		const existing = sessionMap.get(sessionId);
		if (!existing) {
			sessionMap.set(sessionId, {
				repository: repoBySession.get(sessionId) ?? null,
				timestampMs,
			});
		} else {
			if (timestampMs < existing.timestampMs) {
				existing.timestampMs = timestampMs;
			}
		}
	}

	return Array.from(sessionMap.entries()).map(
		([sessionId, { repository, timestampMs }]) => ({
			sessionId,
			repository,
			timestampMs,
		}),
	);
}

export { otlp };
