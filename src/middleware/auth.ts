import { getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { Bindings } from "../types/env";

/** OTLP エンドポイント用: Bearer token 認証 */
export const bearerAuth = createMiddleware<{ Bindings: Bindings }>(
	async (c, next) => {
		const authHeader = c.req.header("Authorization");
		if (!authHeader) {
			return c.json({ error: "Missing Authorization header" }, 401);
		}

		const token = authHeader.replace(/^Bearer\s+/i, "");
		if (token !== c.env.AUTH_TOKEN) {
			return c.json({ error: "Invalid token" }, 401);
		}

		await next();
	},
);

const COOKIE_NAME = "cc_dashboard_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** ダッシュボード用: Cookie ベース認証（初回は ?token= でログイン） */
export const dashboardAuth = createMiddleware<{ Bindings: Bindings }>(
	async (c, next) => {
		// Cookie チェック
		const sessionToken = getCookie(c, COOKIE_NAME);
		if (sessionToken === c.env.AUTH_TOKEN) {
			await next();
			return;
		}

		// クエリパラメータでログイン
		const queryToken = c.req.query("token");
		if (queryToken === c.env.AUTH_TOKEN) {
			setCookie(c, COOKIE_NAME, queryToken, {
				httpOnly: true,
				secure: true,
				sameSite: "Lax",
				maxAge: COOKIE_MAX_AGE,
				path: "/",
			});
			// token パラメータを除去してリダイレクト
			const url = new URL(c.req.url);
			url.searchParams.delete("token");
			return c.redirect(url.pathname + url.search);
		}

		return c.text("Unauthorized. Access with ?token=YOUR_TOKEN", 401);
	},
);
