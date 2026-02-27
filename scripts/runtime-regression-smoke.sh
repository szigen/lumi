#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "[FAIL] $1" >&2
  exit 1
}

echo "[1/6] Lint"
npm run -s lint

echo "[2/6] Typecheck"
npm run -s typecheck

echo "[3/6] Removed legacy IPC channels are absent in source"
if rg -n "TERMINAL_LIST|TERMINAL_BUFFER|BUGS_ASK_CLAUDE|BUGS_CLAUDE_STREAM" src >/dev/null; then
  fail "Legacy IPC channels detected in source files"
fi

echo "[4/6] Removed preload aliases are absent in source"
if rg -n "askClaude|onClaudeStream|listTerminals|getTerminalBuffer" src/preload src/renderer >/dev/null; then
  fail "Legacy preload aliases detected"
fi

echo "[5/6] Terminal status domain uses canonical values"
if rg -n "status:\s*'running'" src/renderer src/main >/dev/null; then
  fail "Deprecated terminal status value 'running' detected"
fi

echo "[6/6] Modular IPC handler files exist"
required_files=(
  "src/main/ipc/handlers/register-terminal-handlers.ts"
  "src/main/ipc/handlers/register-repo-git-handlers.ts"
  "src/main/ipc/handlers/register-config-window-handlers.ts"
  "src/main/ipc/handlers/register-action-persona-handlers.ts"
  "src/main/ipc/handlers/register-system-handlers.ts"
  "src/main/ipc/handlers/types.ts"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    fail "Missing required file: $file"
  fi
done

echo "[PASS] Runtime regression smoke checks completed successfully"
