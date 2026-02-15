import { Hono } from "hono";
import { DailyCosts } from "../components/DailyCosts";
import { DailyTokens } from "../components/DailyTokens";
import { Layout } from "../components/Layout";
import { Overview } from "../components/Overview";
import { RecentSessions } from "../components/RecentSessions";
import { ToolUsage } from "../components/ToolUsage";
import {
	getDailyCosts,
	getDailyTokens,
	getOverviewStats,
	getRecentSessions,
	getToolUsage,
} from "../queries/dashboard";
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

export { dashboard };
