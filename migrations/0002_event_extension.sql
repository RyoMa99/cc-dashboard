-- sessions: セッション単位の集約情報
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  repository TEXT,
  first_event_at INTEGER NOT NULL,
  last_event_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_repository ON sessions(repository);
CREATE INDEX idx_sessions_last_event ON sessions(last_event_at);

-- user_prompts: ユーザー入力イベント
CREATE TABLE user_prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_sequence INTEGER,
  timestamp_ns TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  prompt_length INTEGER NOT NULL DEFAULT 0,
  prompt TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_user_prompts_session ON user_prompts(session_id);
CREATE INDEX idx_user_prompts_timestamp ON user_prompts(timestamp_ms);

-- tool_decisions: ツール許可/拒否イベント
CREATE TABLE tool_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_sequence INTEGER,
  timestamp_ns TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  decision TEXT NOT NULL,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tool_decisions_session ON tool_decisions(session_id);
CREATE INDEX idx_tool_decisions_timestamp ON tool_decisions(timestamp_ms);

-- tool_results に tool_parameters カラムを追加
ALTER TABLE tool_results ADD COLUMN tool_parameters TEXT;
