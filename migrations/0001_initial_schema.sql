-- api_requests: コスト・トークン情報（最重要）
CREATE TABLE api_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_sequence INTEGER,
  timestamp_ns TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  model TEXT NOT NULL,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_api_requests_session ON api_requests(session_id);
CREATE INDEX idx_api_requests_timestamp ON api_requests(timestamp_ms);

-- tool_results: ツール実行結果
CREATE TABLE tool_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_sequence INTEGER,
  timestamp_ns TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 1,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  decision TEXT,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tool_results_session ON tool_results(session_id);
CREATE INDEX idx_tool_results_timestamp ON tool_results(timestamp_ms);

-- api_errors: API エラー
CREATE TABLE api_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_sequence INTEGER,
  timestamp_ns TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  model TEXT,
  error TEXT NOT NULL,
  status_code INTEGER,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  attempt INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_api_errors_session ON api_errors(session_id);
CREATE INDEX idx_api_errors_timestamp ON api_errors(timestamp_ms);

-- metric_data_points: 汎用メトリクス
CREATE TABLE metric_data_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  metric_name TEXT NOT NULL,
  value REAL NOT NULL,
  timestamp_ns TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  attr_type TEXT,
  attr_model TEXT,
  attributes_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_metrics_session ON metric_data_points(session_id);
CREATE INDEX idx_metrics_timestamp ON metric_data_points(timestamp_ms);
CREATE INDEX idx_metrics_name ON metric_data_points(metric_name);
