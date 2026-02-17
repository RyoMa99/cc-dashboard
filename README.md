# CC Dashboard

Claude Code の OpenTelemetry テレメトリデータを受信・可視化する個人向け軽量ダッシュボード。

## アーキテクチャ

```mermaid
graph TB
    subgraph Client
        CC[Claude Code]
    end

    subgraph "Cloudflare Workers"
        subgraph "OTLP Receiver"
            AUTH[Bearer Auth]
            LP[Log Parser]
            MP[Metric Parser]
        end

        subgraph Repositories
            ER[Events Repository]
            MR[Metrics Repository]
        end

        subgraph "Dashboard SSR"
            Q[Queries]
            JSX[Hono JSX Components]
            SVG[SVG Charts]
        end
    end

    subgraph "Cloudflare D1"
        DB[(SQLite)]
    end

    Browser[Browser]

    CC -- "POST /v1/logs\n(OTLP HTTP/JSON)" --> AUTH
    CC -- "POST /v1/metrics\n(OTLP HTTP/JSON)" --> AUTH
    AUTH --> LP
    AUTH --> MP
    LP --> ER
    MP --> MR
    ER --> DB
    MR --> DB

    Browser -- "GET /" --> Q
    Q --> DB
    Q --> JSX
    JSX --> SVG
    JSX -- "SSR HTML" --> Browser
```

### データフロー

**テレメトリ取り込み** (Claude Code → D1)

```mermaid
flowchart LR
    A[OTLP\nLogRecord] --> B{event.name}
    B -->|api_request| C[api_requests]
    B -->|tool_result| D[tool_results]
    B -->|api_error| E[api_errors]
    B -->|user_prompt| UP[user_prompts]
    B -->|tool_decision| TD[tool_decisions]

    A -- "resource\nattributes" --> S[sessions]

    F[OTLP\nMetric] --> G[metric_data_points]

    C & D & E & UP & TD & S & G --> H[(D1)]
```

**ダッシュボード表示** (D1 → Browser)

```mermaid
flowchart LR
    H[(D1)] --> Q1[Overview Stats]
    H --> Q2[Daily Tokens]
    H --> Q3[Daily Costs]
    H --> Q4[Tool Usage]
    H --> Q5[Recent Sessions]

    Q1 & Q2 & Q3 & Q4 & Q5 --> SSR[Hono JSX SSR]
    SSR --> HTML[HTML + SVG Charts]
```

## 技術スタック

| 領域 | 技術 |
|------|------|
| ランタイム | Cloudflare Workers |
| DB | Cloudflare D1 (SQLite) |
| フレームワーク | Hono (JSX SSR) |
| チャート | SVG (サーバーサイド生成、依存なし) |
| テスト | Vitest + @cloudflare/vitest-pool-workers |
| Lint / Format | Biome |

## DB スキーマ

```mermaid
erDiagram
    sessions {
        text session_id PK
        text repository
        int first_event_at
        int last_event_at
    }

    api_requests {
        int id PK
        text session_id
        text model
        real cost_usd
        int input_tokens
        int output_tokens
        int cache_read_tokens
        int cache_creation_tokens
        int duration_ms
        int timestamp_ms
    }

    tool_results {
        int id PK
        text session_id
        text tool_name
        int success
        int duration_ms
        text error
        text tool_parameters
        text mcp_server_name
        text mcp_tool_name
        text skill_name
        int timestamp_ms
    }

    api_errors {
        int id PK
        text session_id
        text model
        text error
        int status_code
        int attempt
        int duration_ms
        int timestamp_ms
    }

    user_prompts {
        int id PK
        text session_id
        int prompt_length
        text prompt
        int timestamp_ms
    }

    tool_decisions {
        int id PK
        text session_id
        text tool_name
        text decision
        text source
        int timestamp_ms
    }

    metric_data_points {
        int id PK
        text session_id
        text metric_name
        real value
        text attr_type
        text attr_model
        text attributes_json
        int timestamp_ms
    }

    sessions ||--o{ api_requests : ""
    sessions ||--o{ tool_results : ""
    sessions ||--o{ api_errors : ""
    sessions ||--o{ user_prompts : ""
    sessions ||--o{ tool_decisions : ""
```

## セットアップ

### ローカル開発

```bash
pnpm install
pnpm db:migrate:local
pnpm dev
```

`.dev.vars` に認証トークンを設定:

```
AUTH_TOKEN=dummy
```

### Claude Code の OTLP 送信設定

`~/.claude/settings.json` に追加:

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/json",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:8787",
    "OTEL_EXPORTER_OTLP_HEADERS": "Authorization=Bearer dummy",
    "OTEL_LOG_TOOL_DETAILS": "1"
  }
}
```

`OTEL_LOG_TOOL_DETAILS=1` を設定すると、MCP ツール名（`mcp_server_name`, `mcp_tool_name`）やスキル名（`skill_name`）がダッシュボードに表示される。未設定の場合、MCP ツールは `mcp_tool` としてまとめて表示される。

### リポジトリ別フィルタの設定

ダッシュボードはリポジトリ別にコストやセッションをフィルタできる。Claude Code は `repository` 属性を自動送信しないため、プロジェクトごとに `OTEL_RESOURCE_ATTRIBUTES` で明示的に設定する必要がある。

各プロジェクトの `.claude/settings.json` に追加:

```json
{
  "env": {
    "OTEL_RESOURCE_ATTRIBUTES": "repository=<リポジトリ名>"
  }
}
```

- `repository` の値はダッシュボードのフィルタドロップダウンに表示される
- 設定しない場合、セッションの `repository` は空になりフィルタで「(未設定)」として扱われる
- グローバル設定（`~/.claude/settings.json`）ではなくプロジェクトごとの設定（`.claude/settings.json`）を使う

### デプロイ

```bash
pnpm wrangler d1 create <db-name>    # D1 作成 → wrangler.toml に ID 設定
pnpm db:migrate:remote                # マイグレーション適用
echo "<token>" | pnpm wrangler secret put AUTH_TOKEN
pnpm run deploy
```