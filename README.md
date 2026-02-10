# AI Orchestrator

<p align="center">
  <img src="docs/logo.svg" alt="AI Orchestrator" width="120" />
</p>

<p align="center">
  <strong>Desktop dashboard for managing multiple Claude Code CLI instances</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

AI Orchestrator is an Electron-based desktop application that lets you run and manage multiple [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI sessions from a single dashboard. Think of it as a mission control for your AI-powered coding workflows.

## Features

- **Multi-terminal management** — Spawn up to 12 Claude Code sessions, each with its own terminal, running in parallel
- **Action system** — Define reusable YAML-based workflows (run tests, sync plugins, update docs) with Claude CLI flag support
- **Persona system** — Switch between predefined AI personas (architect, reviewer, fixer, expert) with custom system prompts
- **Git integration** — Built-in branch management, file changes view, and commit history per repository
- **Multi-repo support** — Work across multiple repositories with tab-based navigation
- **Terminal codenames** — Each session gets a unique codename (e.g., "brave-alpaca") with a collectible discovery system
- **Keyboard shortcuts** — Configurable shortcuts for common actions
- **Native notifications** — Terminal bell detection with OS-level notifications

## Prerequisites

- **Node.js** 18+
- **Claude Code CLI** installed and authenticated (`npm install -g @anthropic-ai/claude-code`)
- **macOS** (primary platform — Windows/Linux support is untested)

## Installation

```bash
# Clone the repository
git clone https://github.com/sezginsazliogullari/ai-orchestrator.git
cd ai-orchestrator

# Install dependencies
npm install

# Start in development mode
npm run dev
```

## Usage

### Quick Start

1. Launch the app with `npm run dev`
2. Select a repository from the repo selector in the header
3. Click "New Session" or use `Cmd+N` to spawn a Claude Code terminal
4. Use the left sidebar to trigger quick actions or switch between sessions

### Actions

Actions are YAML-based workflows stored in `~/.ai-orchestrator/actions/` (user-level) or `<repo>/.ai-orchestrator/actions/` (project-level).

```yaml
name: Run Tests
description: Run the test suite and report results
steps:
  - write: "npm test"
  - wait_for: "passed|failed"
claude:
  model: sonnet
  permissionMode: bypassPermissions
```

### Personas

Personas customize the AI behavior with system prompts. Stored in `~/.ai-orchestrator/personas/` or `<repo>/.ai-orchestrator/personas/`.

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
npm run lint         # ESLint
npm run typecheck    # TypeScript type checking
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 40 + TypeScript |
| UI | React 19 + Tailwind CSS 4 |
| State | Zustand 5 |
| Terminal | xterm.js 6 + node-pty |
| Animations | Framer Motion 12 |
| Git | simple-git |
| Build | Vite 7 + electron-vite 5 |

### Project Structure

```
src/
├── main/           # Electron main process (terminal, git, actions, personas)
├── preload/        # Secure IPC bridge (contextBridge)
├── renderer/       # React UI (components, stores, hooks)
└── shared/         # Shared types and constants
```

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

## License

[MIT](LICENSE) — Sezgin Sazliogullari
