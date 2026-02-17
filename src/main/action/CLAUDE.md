# Action System

YAML-based quick actions that spawn terminals and execute step sequences.

## Architecture
- **ActionStore** — loads/watches YAML from `~/.pulpo/actions` (user) and `<repo>/.pulpo/actions` (project). Project scope overrides user scope by action `id`.
- **ActionEngine** — executes steps sequentially: `write` (type into terminal), `wait_for` (regex match on output), `delay` (fixed ms wait).
- **build-agent-command.ts** — provider-aware command builder. Remaps `claude` launch content to selected provider, injects Claude flags (`--model`, `--system-prompt-file`, `--allowedTools`, etc.) or Codex model flags when configured.
- **create-action-prompt.ts** — system prompt for the "Create Action" flow.
- **edit-action-prompt.ts** — system prompt builder for Edit Action flow. Takes current YAML + file path, produces Claude system prompt.

## Auto-History / Backup
- Every user-scope YAML change triggers `backupAction()` in the file watcher.
- Backups stored in `~/.pulpo/actions/.history/<action-id>/` as `<ISO-timestamp>.yaml`.
- Max 20 backups per action (oldest pruned automatically).
- `getActionHistory(actionId)` returns sorted backup filenames (newest first).
- `restoreAction(actionId, timestamp)` copies a backup back to the active file.

## Rules
- All `write` step content must end with `\r` (Enter key) and use double quotes in YAML.
- `wait_for` uses regex matching against terminal output via EventEmitter.
- System prompts are written to temp files in `os.tmpdir()/pulpo/` and passed via `--system-prompt-file`.
- Default actions are seeded from `default-actions/` on startup; `seedDefaults()` skips overwriting files with `modified_at` field to preserve user edits.
- Watcher calls `reseedIfDefault()` on file deletion to instantly restore missing defaults.

## Watch Out
- `buildAgentCommand()` is the single entrypoint used by ActionEngine and persona spawning; avoid duplicating provider launch logic in IPC handlers.
- The `.history` directory is inside the user actions dir but excluded from action loading (only `.yaml`/`.yml` files in the root are loaded).
- `getActionContent()` and `getActionFilePath()` scan directories by action ID since filenames may not match IDs.
