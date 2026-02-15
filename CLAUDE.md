# CC Dashboard

Claude Code の OpenTelemetry データを受信・可視化する個人向け軽量ダッシュボード。

## 技術スタック

- **ランタイム**: Cloudflare Workers
- **DB**: Cloudflare D1
- **フレームワーク**: Hono (JSX SSR)
- **テスト**: Vitest + @cloudflare/vitest-pool-workers
- **lint/format**: Biome

## ローカル開発

```bash
npm run dev          # wrangler dev（ポートはログで確認、デフォルト 8787 or 8788）
npm run db:migrate:local  # D1 マイグレーション適用
```

- 環境変数は `.dev.vars` で管理（`AUTH_TOKEN=dummy`）
- ダッシュボードへのアクセス: `http://localhost:{port}/?token=dummy`

## プロジェクト固有の検証手順

グローバルの自動検証（test, typecheck, lint）に加え、以下を実行する。

### API テスト（xh）

```bash
# 認証なしアクセス → 401
xh --ignore-stdin GET http://localhost:{port}/

# token 付きダッシュボード → 200
xh --ignore-stdin GET 'http://localhost:{port}/?token=dummy' --follow

# OTLP logs → 200 {"partialSuccess":{}}
xh --ignore-stdin POST http://localhost:{port}/v1/logs Authorization:"Bearer dummy" --raw '{"resourceLogs":[{"scopeLogs":[{"logRecords":[]}]}]}'

# OTLP metrics → 200 {"partialSuccess":{}}
xh --ignore-stdin POST http://localhost:{port}/v1/metrics Authorization:"Bearer dummy" --raw '{"resourceMetrics":[{"scopeMetrics":[{"metrics":[]}]}]}'
```

### ダッシュボード目視確認（chrome-devtools MCP）

chrome-devtools MCP でダッシュボードページを開き、フルページスクリーンショットを撮ってレイアウト崩れがないか確認する。

## プラン管理

実装計画は `docs/plan/` にバージョン付きで保存する（例: `v0.1.md`, `v0.1.1.md`）。