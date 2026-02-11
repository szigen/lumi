# Action System

YAML-based quick actions that spawn terminals and execute step sequences.

## Architecture
- **ActionStore** — loads/watches YAML from `~/.ai-orchestrator/actions` (user) and `<repo>/.ai-orchestrator/actions` (project). Project scope overrides user scope by action `id`.
- **ActionEngine** — executes steps sequentially: `write` (type into terminal), `wait_for` (regex match on output), `delay` (fixed ms wait)
- **build-claude-command.ts** — injects CLI flags (`--model`, `--system-prompt-file`, `--allowedTools`, etc.) into commands starting with `claude `. Non-claude commands pass through unchanged.
- **create-action-prompt.ts** — system prompt for the "Create Action" flow, spawned as a Claude terminal with `appendSystemPrompt`

## Auto-History / Backup
- Every user-scope YAML change triggers `backupAction()` in the file watcher
- Backups stored in `~/.ai-orchestrator/actions/.history/<action-id>/` as `<ISO-timestamp>.yaml`
- Max 20 backups per action (oldest pruned automatically)
- `getActionHistory(actionId)` returns sorted list of backup filenames (newest first)
- `restoreAction(actionId, timestamp)` copies a backup back to the active file
- IPC channels: `actions:history`, `actions:restore`, `actions:default-ids`

## Context Menu
- Right-click any action button in QuickActions to get a context menu
- **History** — shows list of backup timestamps, click to restore
- **Delete** — removes custom (non-default) actions
- **Reset to Default** — shown for default actions instead of Delete; removes user edits by re-seeding

## Default Actions
- Stored in `default-actions/` (version controlled in repo)
- Seeded to user dir on startup via `seedDefaults()`, always overwritten with latest
- `defaultIds` set tracks which action IDs are defaults (used by UI to show "Reset to Default" vs "Delete")
- Current defaults: `run-tests`, `sync-plugins`, `update-claude-md`, `create-project`

## Rules
- All `write` step content must end with `\r` (Enter key) and use double quotes in YAML
- `wait_for` uses regex matching against terminal output via EventEmitter
- System prompts are written to temp files in `os.tmpdir()/ai-orchestrator/` and passed via `--system-prompt-file`
- Default actions are seeded from `default-actions/` on startup and always overwritten to latest version
- Deprecated actions are auto-cleaned from user dir

## Watch Out
- `buildClaudeCommand` uses regex replace on the `claude ` prefix — flags are inserted before the prompt argument with `--` separator
- ActionEngine spawns terminals with `trackCollection = false` (codenames not tracked for action terminals)
- The `.history` directory is inside the user actions dir but excluded from action loading (only `.yaml`/`.yml` files in the root are loaded)
