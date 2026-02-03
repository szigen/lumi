# AI Orchestrator - MVP Design Document

**Date:** 2026-02-03
**Status:** Approved

## Overview

A user-focused dashboard for managing multiple Claude Code CLI instances across different repositories. Enables parallel task execution with a clean, intuitive interface.

## Core Concept

```
┌─────────────────────────────────────────────────────────────────┐
│ [☰] AI Orchestrator  │ [repo-a ✕] [repo-b ✕] [+]    │ [🌿] [⚙] │
├──────────────┬───────────────────────────────┬──────────────────┤
│ Sol Sidebar  │       Orta Panel              │   Sağ Sidebar    │
│ (collapsible)│   Multiple Terminals          │   (collapsible)  │
│              │                               │                  │
│ • Sessions   │  ┌─────────┐ ┌─────────┐     │  Commit Tree     │
│ • Project    │  │Terminal1│ │Terminal2│     │                  │
│   Context    │  └─────────┘ └─────────┘     │  ▸ main          │
│ • Quick      │  ┌─────────┐ ┌─────────┐     │    ├─ abc123     │
│   Actions    │  │Terminal3│ │Terminal4│     │    └─ def456     │
│              │  └─────────┘ └─────────┘     │                  │
└──────────────┴───────────────────────────────┴──────────────────┘
```

## Technology Stack

### Frontend (Renderer Process)
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **xterm.js** - Terminal emulator

### Backend (Main Process)
- **Electron** - Desktop framework
- **TypeScript** - Type safety
- **node-pty** (or alternative) - Terminal spawn
- **simple-git** - Git operations

### Build & Tooling
- **Vite** - Fast bundling
- **electron-builder** - Packaging
- **ESLint + Prettier** - Code quality

## Project Structure

```
ai-orchestrator/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Entry point
│   │   ├── terminal.ts    # Claude CLI wrapper
│   │   ├── git.ts         # Git operations
│   │   └── config.ts      # Settings management
│   ├── renderer/          # React app
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Header/
│   │   │   ├── LeftSidebar/
│   │   │   ├── RightSidebar/
│   │   │   └── TerminalPanel/
│   │   ├── stores/        # Zustand stores
│   │   └── hooks/
│   ├── shared/            # Shared types, utils
│   └── preload/           # IPC bridge
├── docs/
│   └── plans/
├── electron.config.js
├── package.json
└── tailwind.config.js
```

## Features

### 1. Header - Repo Tabs

**Functionality:**
- Auto-discovery from `~/Desktop/AiApps` directory
- Only directories with `.git` are listed
- Tab-based navigation between repos
- Drag & drop tab reordering
- Close tabs with ✕

**Icons:**
- `[☰]` - Toggle left sidebar
- `[🌿]` - Toggle right sidebar (commit tree)
- `[⚙]` - Settings

### 2. Left Sidebar

**Sessions:**
- List of active terminals
- Status indicator (running/idle/error)
- Click to focus terminal
- Right-click: Kill, Rename

**Project Context:**
- File tree of active repo
- Click to preview file
- Drag & drop to Claude terminal

**Quick Actions:**
| Action | Command |
|--------|---------|
| Run Tests | `npm test` / `yarn test` |
| Install Deps | `npm install` / `yarn` |
| Git Pull | `git pull origin <branch>` |
| New Terminal | Spawn new Claude CLI |

### 3. Terminal Panel (Center)

**Layout Modes:**
- **Grid** - 2x2, 2x3, auto-fit
- **Tabs** - Single terminal large, others as tabs

**Terminal Card:**
```
┌─────────────────────────────────┐
│ Terminal 1                    ✕ │
├─────────────────────────────────┤
│ $ claude                        │
│                                 │
│ > Fix the login bug...          │
│                                 │
│ I'll analyze the auth module... │
│                                 │
│ ● Completed ✓                   │
├─────────────────────────────────┤
│ [input field...            ⏎]   │
└─────────────────────────────────┘
```

**Technical:**
- `xterm.js` for terminal rendering
- `node-pty` for pseudo-terminal
- IPC bridge for main ↔ renderer communication

**Limits:**
- Maximum 12 concurrent terminals (configurable)

### 4. Right Sidebar - Commit Tree

**Display:**
```
▼ main
  ├─● abc1234 (HEAD)
  │  "fix: login bug"
  │  2 mins ago
  ├─○ def5678
  │  "feat: add auth"
  │  1 hour ago
  └─○ ... (load more)

▶ feature/new-ui (collapsed)
```

**MVP Scope:**
- View commit list
- Branch collapse/expand
- Click to view commit details

**Technical:**
- `simple-git` for git operations
- File watcher for auto-refresh

### 5. Data Persistence

**File Structure:**
```
~/.ai-orchestrator/
├── config.json          # Settings
├── ui-state.json        # UI state
└── work-logs/
    └── YYYY-MM-DD/
        └── <repo>_<terminal>_<task>.json
```

**config.json:**
```json
{
  "projectsRoot": "~/Desktop/AiApps",
  "maxTerminals": 12,
  "theme": "dark"
}
```

**ui-state.json:**
```json
{
  "openTabs": ["project-a", "project-b"],
  "activeTab": "project-a",
  "leftSidebarOpen": true,
  "rightSidebarOpen": false
}
```

**Work Log Entry:**
```json
{
  "id": "uuid",
  "repo": "project-a",
  "task": "fix login bug in auth.ts",
  "startedAt": "2026-02-03T10:00:00Z",
  "completedAt": "2026-02-03T10:05:00Z",
  "status": "completed",
  "output": "... terminal output ..."
}
```

## MVP Scope

### Included
- [x] Repo tabs in header
- [x] Left sidebar (Sessions, Project Context, Quick Actions)
- [x] Multiple terminals (grid/tab layout)
- [x] Right sidebar (Commit tree, collapsible)
- [x] Both sidebars toggleable
- [x] Auto-discovery from AiApps folder
- [x] Work logs for completed tasks
- [x] 12 terminal limit (configurable)
- [x] CLI wrapper approach for Claude Code

### Excluded (Future Phases)
- [ ] Atomizer (task breakdown & auto-assignment)
- [ ] MCP server management
- [ ] Status panel (CPU/RAM monitoring)
- [ ] Custom Quick Actions per repo
- [ ] Commit checkout/cherry-pick/revert
- [ ] Diff viewer

## Architecture

### IPC Communication

```
┌─────────────────┐         ┌─────────────────┐
│ Renderer        │   IPC   │ Main Process    │
│ (React UI)      │ ←─────→ │ (Electron)      │
└─────────────────┘         └─────────────────┘
                                   │
                                   ▼
                            ┌─────────────────┐
                            │ Claude CLI      │
                            │ (spawned via    │
                            │  node-pty)      │
                            └─────────────────┘
```

### Terminal Lifecycle

```
User clicks "New Terminal"
        │
        ▼
IPC: renderer → main (spawn-terminal)
        │
        ▼
Main: spawn('claude', { cwd: repoPath })
        │
        ▼
pty.onData → IPC → renderer (terminal-output)
        │
        ▼
User types → IPC → main → pty.write()
        │
        ▼
Task complete → Save to work-logs
```

## References

- [Auto-Claude](https://github.com/AndyMik90/Auto-Claude) - Multi-agent framework inspiration
- [Vibe-Kanban](https://github.com/BloopAI/vibe-kanban) - Agent orchestration patterns
