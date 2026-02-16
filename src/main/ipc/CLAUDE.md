# IPC Handlers

Main-process IPC registration and dependency wiring.

## Architecture
- `handlers.ts` initializes shared services/managers and builds a typed context.
- Handler registration is split by domain under `handlers/`:
  - `register-terminal-handlers.ts`
  - `register-repo-git-handlers.ts`
  - `register-config-window-handlers.ts`
  - `register-action-persona-handlers.ts`
  - `register-system-handlers.ts`
  - `register-bug-handlers.ts`
- Assistant streaming is delegated to `src/main/assistant/AssistantOrchestrator`.

## Rules
- Every new IPC channel must be added in `src/shared/ipc-channels.ts` and wired from one registration module.
- Keep handler modules thin: validation + orchestration only, core business logic belongs to domain services.
- Terminal sync uses `TERMINAL_SNAPSHOT` as the single pull API for renderer reconciliation.
- Bug stream channel family is `BUGS_ASSISTANT_STREAM_*` (legacy Claude alias channels are removed).
- All bug handlers must validate repo path with absolute-path + existence checks.

## Watch Out
- `mainWindow` can be null or destroyed; stream emitters and UI push events must guard for that.
- `BUGS_APPLY_FIX` writes prompt via randomized heredoc delimiter to avoid fixed-marker collisions.
- `ACTIONS_CREATE_NEW` (Codex path) also uses randomized heredoc delimiter for injected prompt safety.
- `ACTIONS_CREATE_NEW` and `PERSONAS_SPAWN` must use `buildAgentCommand()` for provider-specific command construction.
- Config updates must propagate side effects (`maxTerminals`, repo root, additional paths) and emit `REPOS_CHANGED` when needed.
