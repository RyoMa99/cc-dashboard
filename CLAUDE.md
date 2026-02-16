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
pnpm dev          # wrangler dev（ポートはログで確認、デフォルト 8787 or 8788）
pnpm db:migrate:local  # D1 マイグレーション適用
```

- 環境変数は `.dev.vars` で管理（`AUTH_TOKEN=dummy`）
- ダッシュボードへのアクセス: `http://localhost:{port}/?token=dummy`

### wrangler dev のポート確認

`wrangler dev` はデフォルトポート（8787）が使用中の場合、自動的に別のポート（8788, 8789...）にフォールバックする。
特にテスト実行後は workerd プロセスが 8787/8788 を占有していることがある。

- **必ず wrangler の stdout から `Ready on http://localhost:{port}` を読み取ってポートを確認する**
- デフォルトポート（8787）を仮定しない
- wrangler の出力を `/dev/null` にリダイレクトしない（ポート情報が失われる）

## デプロイ

```bash
pnpm db:migrate:remote   # 1. D1 マイグレーション適用（先に実行）
pnpm run deploy          # 2. Worker コードのデプロイ（※ pnpm deploy ではない）
```

- **マイグレーションを先に実行する**。新しいテーブル/カラムを参照するコードが先にデプロイされるとランタイムエラーになる
- `pnpm run deploy` は Worker コードのみ。**D1 マイグレーションは含まれない**ため、スキーマ変更がある場合は `pnpm db:migrate:remote` を必ず実行する
- マイグレーション未適用の確認: `pnpm wrangler d1 migrations list cc-dashboard-db --remote`

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

## OTLP ペイロード構造

Claude Code が送信する OTLP データは、`session.id` と `OTEL_RESOURCE_ATTRIBUTES` 由来の属性が**異なる階層**に配置される。

```
resourceLogs[]:
  resource:
    attributes: [repository, os.type, service.name, ...]  ← OTEL_RESOURCE_ATTRIBUTES 由来
  scopeLogs[]:
    logRecords[]:
      attributes: [session.id, event.name, model, ...]    ← イベント固有
```

- `repository` は resource-level、`session.id` は record-level
- パーサーで両者を紐づける際は、各 log record の session ID を使うこと（resource-level に session.id は存在しない）
