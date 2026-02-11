# Persona System

YAML-based personas that spawn Claude CLI sessions with preconfigured behavior.

## Architecture
- **PersonaStore** — loads/watches YAML from `~/.ai-orchestrator/personas` (user) and `<repo>/.ai-orchestrator/personas` (project). Same override logic as ActionStore (project overrides user by `id`).
- Personas use the same `ClaudeConfig` type as actions for CLI flags
- Spawning a persona: creates terminal, sets task to persona label, writes `claude ""` command with injected flags via `buildClaudeCommand`

## Rules
- Default personas seeded from `default-personas/` (architect, expert, fixer, reviewer) and always overwritten on startup
- Persona YAML requires: `id`, `label`, `claude` (ClaudeConfig block)
- The `claude` block supports same flags as actions: `systemPrompt`, `appendSystemPrompt`, `model`, `allowedTools`, `permissionMode`, etc.

## Watch Out
- Persona terminals spawn with `trackCollection = false` (codenames not tracked)
- PersonaStore follows identical pattern to ActionStore (constructor, seedDefaults, loadDir, watchDir, dispose)
