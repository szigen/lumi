# Action System

YAML-based quick actions that spawn terminals and execute step sequences.

## Architecture
- **ActionStore** — loads/watches YAML from `~/.ai-orchestrator/actions` (user) and `<repo>/.ai-orchestrator/actions` (project). Project scope overrides user scope by action `id`.
- **ActionEngine** — executes steps sequentially: `write` (type into terminal), `wait_for` (regex match on output), `delay` (fixed ms wait)
- **build-claude-command.ts** — injects CLI flags (`--model`, `--system-prompt-file`, `--allowedTools`, etc.) into commands starting with `claude `. Non-claude commands pass through unchanged.
- **create-action-prompt.ts** — system prompt for the "Create Action" flow, spawned as a Claude terminal with `appendSystemPrompt`

## Rules
- All `write` step content must end with `\r` (Enter key) and use double quotes in YAML
- `wait_for` uses regex matching against terminal output via EventEmitter
- System prompts are written to temp files in `os.tmpdir()/ai-orchestrator/` and passed via `--system-prompt-file`
- Default actions are seeded from `default-actions/` on startup and always overwritten to latest version
- Deprecated actions are auto-cleaned from user dir

## Watch Out
- `buildClaudeCommand` uses regex replace on the `claude ` prefix — flags are inserted before the prompt argument with `--` separator
- ActionEngine spawns terminals with `trackCollection = false` (codenames not tracked for action terminals)
