[![CI](https://github.com/szigen/lumi/actions/workflows/ci.yml/badge.svg)](https://github.com/szigen/lumi/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

# Lumi

<p align="center">
  <img src="src/renderer/assets/mascot/app-icon.png" alt="Lumi" width="120" />
</p>

<p align="center">
  <strong>Desktop dashboard for managing multiple AI coding CLI sessions</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#download">Download</a> •
  <a href="#installation-from-source">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

Lumi is an Electron-based desktop application that lets you run and manage multiple AI coding CLI sessions (Claude Code or OpenAI Codex) from a single dashboard. Think of it as a mission control for your AI-powered coding workflows.

## Features

- **Multi-terminal management** — Spawn up to 20 AI sessions (default 12, configurable in Settings), each with its own terminal, running in parallel
- **Multi-provider support** — Switch between [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [OpenAI Codex CLI](https://github.com/openai/codex) in Settings; all terminals and bug-fix tools use the selected provider
- **Action system** — Define reusable YAML-based workflows (run tests, sync plugins, update docs); create or edit actions via AI with automatic backup history
- **Persona system** — Switch between predefined AI personas (architect, reviewer, fixer, expert) with custom system prompts
- **Git integration** — Built-in branch management, reactive file-changes view with right-click context menu, and commit history per repository
- **Multi-repo support** — Work across multiple repositories with tab-based navigation
- **Terminal codenames** — Each session gets a unique codename (e.g., "brave-alpaca")
- **Smart terminal status** — Activity-based status detection via OSC9 signals, with window-focus-aware notifications
- **Keyboard shortcuts** — Platform-adaptive shortcuts (`Cmd` on macOS, `Ctrl+Shift` on Windows/Linux)
- **Native notifications** — Terminal bell and activity detection with OS-level notifications

## Download

Pre-built binaries for the latest release:

| Platform | Download |
|----------|----------|
| macOS | [Lumi.dmg](https://github.com/szigen/lumi/releases/latest) |
| Windows | [Lumi-Setup.exe](https://github.com/szigen/lumi/releases/latest) |
| Linux | [Lumi.AppImage](https://github.com/szigen/lumi/releases/latest) |

> All downloads are available on the [Releases](https://github.com/szigen/lumi/releases) page.

## Prerequisites

- **Node.js** 22+ (required by Vite 7 — `crypto.hash()` API)
- **AI CLI** — at least one of:
  - Claude Code: `npm install -g @anthropic-ai/claude-code` (then authenticate)
  - OpenAI Codex: install and configure per [Codex CLI docs](https://github.com/openai/codex)
- **macOS** (primary platform), **Windows**, or **Linux**

> **Note:** Lumi uses [node-pty](https://github.com/nicktaf/node-pty) for terminal emulation,
> which requires native compilation. On macOS, Xcode Command Line Tools are needed.
> On Linux, install `build-essential` and `python3`. On Windows, install
> [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/).

## Installation (from source)

```bash
# Clone the repository
git clone https://github.com/szigen/lumi.git
cd lumi

# Install dependencies
npm install

# Start in development mode
npm run dev

# On Linux, use the sandbox-disabled variant:
npm run dev:linux
```

## Usage

### Quick Start

1. Launch the app with `npm run dev`
2. Select a repository from the repo selector in the header
3. Click "New Session" or use `Cmd+T` (`Ctrl+Shift+T` on Windows/Linux) to spawn a Claude Code terminal
4. Use the left sidebar to trigger quick actions or switch between sessions

### Actions

Actions are YAML-based workflows stored in `~/.lumi/actions/` (user-level) or `<repo>/.lumi/actions/` (project-level).

```yaml
id: run-tests
label: Run Tests
icon: TestTube
scope: user
claude:
  model: sonnet
  allowedTools:
    - "Bash(npm test *)"
steps:
  - type: write
    content: "claude \"Run the test suite for this project.\"\r"
```

**Action editing:** Right-click any action in the sidebar to open an AI-assisted edit flow. Changes are preserved across app restarts — default actions are never overwritten once you've modified them.

**Auto-backup:** Every save to a user action is automatically backed up in `~/.lumi/actions/.history/<action-id>/` (up to 20 snapshots, oldest pruned automatically).

### Personas

Personas customize the AI behavior with system prompts. Stored in `~/.lumi/personas/` or `<repo>/.lumi/personas/`.

```yaml
name: Architect
description: High-level system design focus
systemPrompt: |
  You are a senior software architect. Focus on system design,
  scalability, and maintainability.
```

Built-in personas: **Architect**, **Expert**, **Fixer**, **Reviewer**

## Development

```bash
npm run dev          # Development mode (Vite + Electron with HMR)
npm run build        # Production build
npm test             # Vitest unit tests
npm run lint         # ESLint
npm run typecheck    # TypeScript type checking
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 40 + TypeScript |
| UI | React 19 + Custom CSS |
| State | Zustand 5 |
| Terminal | xterm.js 6 + node-pty |
| Animations | Framer Motion 12 |
| Git | simple-git |
| Build | Vite 7 + electron-vite 5 |

### Project Structure

```
src/
├── main/
│   ├── action/         # YAML action system (engine, store, AI edit flow)
│   ├── assistant/      # Multi-provider AI orchestrator (Claude + Codex stream parsers)
│   ├── ipc/            # IPC handlers (split by domain: terminal, git, actions, config…)
│   ├── terminal/       # node-pty sessions, OSC9 status state machine
│   └── …               # persona, git, notification, config, system
├── preload/            # Secure IPC bridge (contextBridge)
├── renderer/           # React UI (components, stores, hooks)
└── shared/             # Shared types and constants
```

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

## License

[MIT](LICENSE) — szigen
