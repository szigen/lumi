# Debug Mode Design

## Overview

Interactive debug mode for Lumi. A dedicated view with a guided 5-stage workflow (Describe, Instrument, Reproduce, Diagnose, Verify) that walks the user through structured bug diagnosis and fix, powered by Claude Code or Codex.

## Architecture

### View Integration

Debug Mode is the third view alongside Terminals and Bugs:

```
activeView: 'terminals' | 'bugs' | 'debug'
```

Entry point: LeftSidebar "Debug Mode" button (below Known Bugs).

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Header (repo tabs, settings, etc.)                 │
├──────────┬──────────────────────────────────────────┤
│ Left     │  ┌─ Stepper Bar ──────────────────────┐  │
│ Sidebar  │  │ [Describe]→[Instrument]→[Reproduce]│  │
│          │  │ →[Diagnose]→[Verify]               │  │
│ Sessions │  └────────────────────────────────────┘  │
│ -------- │  ┌─ Stage Content ─────┬─ Terminal ────┐  │
│ Debug ●  │  │  Rich    │  AI Terminal  │  │
│ (button) │  │  inline cards:      │  (Claude/     │  │
│ -------- │  │  - Command results  │   Codex)      │  │
│ Project  │  │  - Debug Logs panel │               │  │
│ Context  │  │  - Repro steps      │  $ claude     │  │
│          │  │  - Diagnosis cards  │  > Working... │  │
│ Quick    │  ├─ Actions ───────────┴───────────────┤  │
│ Actions  │  │ [Mark Fixed] [Proceed ⌘↩]           │  │
│          │  ├─ Input ─────────────────────────────┤  │
│          │  │ Additional context about the issue   │  │
│          │  └─────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────┘
```

### Engine Abstraction

The AI interaction mechanism is abstracted behind a `DebugEngine` interface so two approaches can be tested in parallel via git worktrees:

```
DebugSession (UI Layer)
  └── uses → DebugEngine (interface)
                ├── SingleSessionEngine
                └── MultiSessionEngine
```

**SingleSessionEngine**: One interactive terminal session. Each stage transition sends a new prompt to the same session.

**MultiSessionEngine**: Stage 1 uses headless mode (`claude -p "..."`). Lumi watches log files with `fs.watch` during reproduce. Stage 4 spawns a new interactive session with collected logs as context.

## Data Model

```typescript
interface DebugSession {
  id: string
  repoPath: string
  title: string
  description: string
  stage: DebugStage
  status: 'active' | 'completed' | 'abandoned'
  createdAt: string
  completedAt?: string
  logLocations?: LogLocation[]
  reproSteps?: string[]
  collectedLogs?: LogEntry[]
  diagnosis?: string
  fixApplied?: boolean
  result?: 'fixed' | 'not-fixed'
  resultNotes?: string
  engineType: 'single-session' | 'multi-session'
  terminalIds: string[]
}

type DebugStage = 'describe' | 'instrument' | 'reproduce' | 'diagnose' | 'verify'

interface LogLocation {
  file: string
  line: number
  logStatement: string
}

interface LogEntry {
  timestamp: string
  message: string
  source?: string
}
```

Persistence: `<repo>/.lumi/debug-sessions/<id>.json`

## Stage Flow

### Stage 1: Describe

User fills in bug title and description. "Start Debug" creates the session and spawns the AI terminal.

### Stage 2: Instrument

AI analyzes the bug, adds debug logging to relevant files, and returns structured reproduction steps. UI shows:
- Spinner while AI works
- Added log locations as inline cards
- Reproduction steps checklist

Auto-advances to Reproduce when complete.

### Stage 3: Reproduce

User reproduces the bug externally. UI shows:
- Reproduction steps (reference)
- Debug Logs panel (live via `fs.watch` in multi-session engine, passive in single-session)
- Additional context input field
- "Proceed" button (collects logs, advances to Diagnose)
- "Mark Fixed" button (skips to Verify if logging alone revealed the fix)

### Stage 4: Diagnose

AI receives collected logs + bug description. Analyzes root cause and applies fix. UI shows:
- Collected logs summary (expandable)
- Diagnosis card (root cause explanation)
- Fix applied card (files changed)

Auto-advances to Verify when complete.

### Stage 5: Verify

User tests the fix. UI shows:
- Summary of what was fixed
- Optional notes field
- "Fixed" button (completes session, triggers debug log cleanup)
- "Not Fixed" button (loops back to Instrument with additional context)

## Engine Interface

```typescript
interface DebugEngine {
  instrument(session: DebugSession): Promise<InstrumentResult>
  diagnose(session: DebugSession, logs: LogEntry[]): Promise<DiagnoseResult>
  cleanup(session: DebugSession): Promise<void>
  getTerminalIds(): string[]
}

interface InstrumentResult {
  logLocations: LogLocation[]
  reproSteps: string[]
  logFilePath: string
}

interface DiagnoseResult {
  diagnosis: string
  filesChanged: { file: string; summary: string }[]
}
```

## Store

```typescript
interface DebugState {
  sessions: DebugSession[]
  activeSessionId: string | null
  logWatcherActive: boolean
  liveLogEntries: LogEntry[]

  createSession(title: string, description: string, repoPath: string): void
  advanceStage(sessionId: string): void
  goBackToStage(sessionId: string, stage: DebugStage): void
  completeSession(sessionId: string, result: 'fixed' | 'not-fixed'): void
  abandonSession(sessionId: string): void
  appendLogEntry(entry: LogEntry): void
}
```

## IPC Channels

```
debug:list-sessions    → session list
debug:create-session   → create new session
debug:update-session   → update session
debug:delete-session   → delete session
debug:start-log-watch  → start fs.watch on log file
debug:stop-log-watch   → stop fs.watch
debug:log-entry (event)→ new log entry from watcher
```

## Entry Point & History

First open shows session history inside the debug panel (not in sidebar):

- "New Debug Session" button
- Recent sessions list with status indicators (active/fixed/abandoned)
- Click to resume or review a past session

## Provider Support

Both Claude Code and Codex are supported. Engine implementations handle provider-specific CLI flags (e.g., `claude -p` vs codex equivalent for headless mode).

## Testing Strategy

Two git worktrees for parallel engine testing:
- worktree-A: SingleSessionEngine
- worktree-B: MultiSessionEngine

Compare reliability, UX, and context quality. Pick the winner or keep both as user-selectable options.
