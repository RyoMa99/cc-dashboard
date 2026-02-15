# データ充実化 設計ドキュメント

## 背景

現在のダッシュボードは概要統計（コスト・トークン・セッション数）と日別チャートを表示しているが、以下の情報が不足している:

- リポジトリ別のコスト集計
- Bash コマンドや Tool パラメータの詳細
- セッション内のイベント時系列（会話の流れ）
- ツール許可/拒否の判定履歴
- キャッシュ効率・コスト効率の分析

## Claude Code OTLP データの現状

### 現在キャプチャ済み

| イベント | 属性 |
|---------|------|
| `api_request` | model, cost_usd, duration_ms, tokens (input/output/cache) |
| `tool_result` | tool_name, success, duration_ms, error, decision, source |
| `api_error` | model, error, status_code, duration_ms, attempt |

### 未キャプチャ（今回追加対象）

| イベント/属性 | 説明 |
|-------------|------|
| `user_prompt` | ユーザープロンプト（文字数、opt-in で本文） |
| `tool_decision` | ツール許可/拒否の判定（tool_name, decision, source） |
| `tool_parameters` | tool_result の追加属性（Bash コマンド、MCP/Skill 名） |
| resource `repository` | `OTEL_RESOURCE_ATTRIBUTES` によるカスタム属性 |

### 実現不可能

- CLAUDE.md / rules ファイルの適用状況（テレメトリに含まれない）

## データモデル

### 新規テーブル

```sql
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  repository TEXT,
  first_event_at INTEGER NOT NULL,
  last_event_at INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_repository ON sessions(repository);

CREATE TABLE user_prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_sequence INTEGER,
  timestamp_ns TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  prompt_length INTEGER NOT NULL,
  prompt TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_user_prompts_session ON user_prompts(session_id, timestamp_ms);

CREATE TABLE tool_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_sequence INTEGER,
  timestamp_ns TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  decision TEXT NOT NULL,
  source TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_tool_decisions_session ON tool_decisions(session_id, timestamp_ms);
```

### 既存テーブル拡張

```sql
ALTER TABLE tool_results ADD COLUMN tool_parameters TEXT;
```

## パーサー拡張

- `user_prompt` イベントをパース（prompt_length, prompt）
- `tool_decision` イベントをパース（tool_name, decision, source）
- `tool_result` から `tool_parameters` 属性を抽出（JSON）
- resource attributes から `repository` カスタム属性を抽出
- sessions テーブルを upsert（初回 INSERT、以降は last_event_at 更新）

## セッション詳細ページ

**ルート**: `GET /session/:id`

全イベント（user_prompt, api_request, tool_result, tool_decision, api_error）を `event_sequence` / `timestamp_ms` でソートしたタイムラインビュー。

- SSR のみ（client JS なし）
- RecentSessions テーブルから session_id リンクで遷移
- Bash コマンドは tool_parameters からインライン表示
- user_prompt はデフォルト文字数のみ、`OTEL_LOG_USER_PROMPTS=1` 時は本文表示

## Overview ダッシュボード拡張

- リポジトリフィルタ（SSR リンクベース、`/?repo=cc-dashboard`）
- リポジトリ別コスト集計（横棒グラフ + テーブル）
- キャッシュ効率カード（cache_read / input ヒット率 %）
- コスト効率（モデル別 $/1K output tokens）
- RecentSessions にリポジトリ列追加 + session_id リンク化

## ユーザー側設定

```json
// ~/.claude/settings.json（グローバル）
{
  "env": {
    "OTEL_LOG_TOOL_DETAILS": "1",
    "OTEL_METRICS_INCLUDE_VERSION": "true"
  }
}

// .claude/settings.local.json（プロジェクトごと）
{
  "env": {
    "OTEL_RESOURCE_ATTRIBUTES": "repository=cc-dashboard"
  }
}
```

| 設定 | 効果 | 必須度 |
|------|------|--------|
| `OTEL_RESOURCE_ATTRIBUTES=repository=X` | リポジトリ別集計 | 推奨 |
| `OTEL_LOG_TOOL_DETAILS=1` | MCP/Skill 名の記録 | 推奨 |
| `OTEL_LOG_USER_PROMPTS=1` | プロンプト本文の記録 | 任意 |
