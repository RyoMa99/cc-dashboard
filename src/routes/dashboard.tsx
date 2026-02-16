import { Hono } from "hono";
import { DailyCosts } from "../components/DailyCosts";
import { DailyTokens } from "../components/DailyTokens";
import { Layout } from "../components/Layout";
import { Overview } from "../components/Overview";
import { RecentSessions } from "../components/RecentSessions";
import { SessionTimeline } from "../components/SessionTimeline";
import { ToolUsage } from "../components/ToolUsage";
import {
	getDailyCosts,
	getDailyTokens,
	getOverviewStats,
	getRecentSessions,
	getToolUsage,
} from "../queries/dashboard";
import { getSessionInfo, getSessionTimeline } from "../queries/session";
import type { Bindings } from "../types/env";

const dashboard = new Hono<{ Bindings: Bindings }>();

dashboard.get("/", async (c) => {
	const [stats, dailyCosts, dailyTokens, toolUsage, sessions] =
		await Promise.all([
			getOverviewStats(c.env.DB),
			getDailyCosts(c.env.DB),
			getDailyTokens(c.env.DB),
			getToolUsage(c.env.DB),
			getRecentSessions(c.env.DB),
		]);

	return c.html(
		<Layout>
			<Overview stats={stats} />
			<DailyTokens rows={dailyTokens} />
			<DailyCosts rows={dailyCosts} />
			<ToolUsage tools={toolUsage} />
			<RecentSessions sessions={sessions} />
		</Layout>,
	);
});

dashboard.get("/session/:id", async (c) => {
	const sessionId = c.req.param("id");
	const session = await getSessionInfo(c.env.DB, sessionId);

	if (!session) {
		return c.html(
			<Layout>
				<section>
					<div class="flex items-center gap-3 mb-4">
						<a href="/" class="text-sm text-blue-400 hover:text-blue-300">
							Dashboard
						</a>
						<span class="text-gray-600">/</span>
						<span class="text-sm text-gray-400">Session</span>
					</div>
					<h2 class="text-lg font-semibold mb-2">Session Not Found</h2>
					<p class="text-gray-400 text-sm">
						Session <code class="font-mono">{sessionId}</code> does not exist.
					</p>
				</section>
			</Layout>,
			404,
		);
	}

	const events = await getSessionTimeline(c.env.DB, sessionId);

	return c.html(
		<Layout>
			<SessionTimeline session={session} events={events} />
		</Layout>,
	);
});

export { dashboard };
