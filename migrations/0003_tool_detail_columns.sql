-- 1. 新カラム追加
ALTER TABLE tool_results ADD COLUMN mcp_server_name TEXT;
ALTER TABLE tool_results ADD COLUMN mcp_tool_name TEXT;
ALTER TABLE tool_results ADD COLUMN skill_name TEXT;

-- 2. 既存データのバックフィル（tool_parameters JSON から抽出）
UPDATE tool_results SET
  mcp_server_name = json_extract(tool_parameters, '$.mcp_server_name'),
  mcp_tool_name = json_extract(tool_parameters, '$.mcp_tool_name'),
  skill_name = json_extract(tool_parameters, '$.skill_name')
WHERE tool_parameters IS NOT NULL;

-- 3. 不要カラム削除（tool_decisions テーブルと重複、未使用）
ALTER TABLE tool_results DROP COLUMN decision;
ALTER TABLE tool_results DROP COLUMN source;
