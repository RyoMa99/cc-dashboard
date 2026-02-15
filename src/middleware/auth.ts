import { createMiddleware } from "hono/factory";
import type { Bindings } from "../types/env";

/** OTLP エンドポイント用: Bearer token 認証 */
export const bearerAuth = createMiddleware<{ Bindings: Bindings }>(
	async (c, next) => {
		const authHeader = c.req.header("Authorization");
		if (!authHeader) {
			return c.json({ error: "Missing Authorization header" }, 401);
		}

		const match = authHeader.match(/^Bearer\s+(.+)$/i);
		if (!match || match[1] !== c.env.AUTH_TOKEN) {
			return c.json({ error: "Invalid token" }, 401);
		}

		await next();
	},
);
