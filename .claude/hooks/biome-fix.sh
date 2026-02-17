#!/bin/bash
# PostToolUse hook: Edit/Write 後に Biome で lint + format を自動適用
set -euo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# ファイルパスが取得できない場合はスキップ
if [[ -z "$FILE" ]]; then
  exit 0
fi

# Biome 対応ファイルのみ対象（ts/tsx/json/jsonc）
if [[ ! "$FILE" =~ \.(ts|tsx|json|jsonc)$ ]]; then
  exit 0
fi

# ファイルが存在しない場合はスキップ（削除されたファイル等）
if [[ ! -f "$FILE" ]]; then
  exit 0
fi

# Biome で lint + format + import整理を適用
pnpm biome check --write "$FILE" 2>/dev/null || true
