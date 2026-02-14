import { Hono } from "hono";
import { dashboard } from "./routes/dashboard";
import { otlp } from "./routes/otlp";
import type { Bindings } from "./types/env";

const app = new Hono<{ Bindings: Bindings }>();

// OTLP レシーバー
app.route("/", otlp);

// ダッシュボード
app.route("/", dashboard);

export default app;
