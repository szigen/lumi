[![CI](https://github.com/szigen/lumi/actions/workflows/ci.yml/badge.svg)](https://github.com/szigen/lumi/actions)
[![Release](https://img.shields.io/github/v/release/szigen/lumi)](https://github.com/szigen/lumi/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

# Lumi

<p align="center">
  <img src="src/renderer/assets/mascot/app-icon.webp" alt="Lumi" width="120" />
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
- **Multi-provider support** — Switch between [Claude Code](https://code.claude.com/docs/en/setup) and [OpenAI Codex CLI](https://github.com/openai/codex) in Settings; all terminals and bug-fix tools use the selected provider
- **Action system** — Define reusable YAML-based workflows (run tests, sync plugins, update docs); create or edit actions via AI with automatic backup history
- **Persona system** — Switch between predefined AI personas (architect, reviewer, fixer, expert) with custom system prompts
- **Git integration** — Built-in branch management, reactive file-changes view with right-click context menu, and commit history per repository
- **Multi-repo support** — Work across multiple repositories with tab-based navigation
- **Terminal codenames** — Each session gets a unique codename (e.g., "brave-alpaca")
- **Smart terminal status** — Activity-based status detection via OSC9 signals, with window-focus-aware notifications
- **Keyboard shortcuts** — Platform-adaptive shortcuts (`Cmd` on macOS, `Ctrl+Shift` on Windows/Linux)
- **Native notifications** — Terminal bell and activity detection with OS-level notifications

## Download

| Platform | Installer | Portable |
|----------|-----------|----------|
| macOS (Apple Silicon) | [Lumi-0.1.5-arm64-mac.dmg](https://github.com/szigen/lumi/releases/download/v0.1.5/Lumi-0.1.5-arm64-mac.dmg) | [.zip](https://github.com/szigen/lumi/releases/download/v0.1.5/Lumi-0.1.5-arm64-mac.zip) |
| Windows | [Lumi-Setup-0.1.5-win.exe](https://github.com/szigen/lumi/releases/download/v0.1.5/Lumi-Setup-0.1.5-win.exe) | [.exe](https://github.com/szigen/lumi/releases/download/v0.1.5/Lumi-0.1.5-win.exe) |
| Linux | [Lumi-0.1.5-linux-x86_64.AppImage](https://github.com/szigen/lumi/releases/download/v0.1.5/Lumi-0.1.5-linux-x86_64.AppImage) | [.deb](https://github.com/szigen/lumi/releases/download/v0.1.5/Lumi-0.1.5-linux-amd64.deb) |

> All downloads are available on the [Releases](https://github.com/szigen/lumi/releases) page.

### Installation

**Before you start:** You need at least one AI CLI installed and authenticated:
- [Claude Code](https://code.claude.com/docs/en/setup): `curl -fsSL https://claude.ai/install.sh | bash` (macOS/Linux) or `irm https://claude.ai/install.ps1 | iex` (Windows)
- [OpenAI Codex CLI](https://github.com/openai/codex): `npm install -g @openai/codex` (see [official docs](https://developers.openai.com/codex/cli/))

<details>
<summary><strong>macOS</strong></summary>

**DMG (recommended):**
1. Download the `.dmg` file
2. Open it and drag **Lumi** into your **Applications** folder
3. Launch Lumi and select a repository to start

**Portable (ZIP):**
1. Extract the `.zip` file
2. Run `Lumi.app` directly — no installation needed

</details>

<details>
<summary><strong>Windows</strong></summary>

1. Download `Lumi-Setup-0.1.5-win.exe`
2. Run the installer — Windows SmartScreen may show a warning since Lumi is unsigned. Click **"More info"** → **"Run anyway"** to proceed
3. Choose the installation directory and complete the setup
4. Launch from the Start Menu or Desktop shortcut

> **Portable:** Download `Lumi-0.1.5-win.exe` and run it directly — no installation needed. The same SmartScreen warning applies.

</details>

<details>
<summary><strong>Linux</strong></summary>

**AppImage (recommended):**
```bash
chmod +x Lumi-0.1.5-linux-x86_64.AppImage
./Lumi-0.1.5-linux-x86_64.AppImage
```

**DEB package (Debian/Ubuntu):**
```bash
sudo dpkg -i Lumi-0.1.5-linux-amd64.deb
```

> If you get a sandbox error, either run with the `--no-sandbox` flag or set the environment variable:
> ```bash
> ELECTRON_DISABLE_SANDBOX=1 ./Lumi-0.1.5-linux-x86_64.AppImage
> ```

</details>

## Prerequisites (building from source)

- **Node.js** 22+ (required by Vite 7 — `crypto.hash()` API)
- **AI CLI** — at least one of:
  - Claude Code: `curl -fsSL https://claude.ai/install.sh | bash` (then authenticate)
  - OpenAI Codex: `npm install -g @openai/codex` (see [Codex CLI docs](https://developers.openai.com/codex/cli/))
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

**Installed app:**
1. Launch Lumi from your Applications folder, Start Menu, or desktop
2. Select a repository from the repo selector in the header
3. Click "New Session" or use `Cmd+T` (`Ctrl+Shift+T` on Windows/Linux) to spawn an AI coding terminal
4. Use the left sidebar to trigger quick actions or switch between sessions

**From source:**
1. Run `npm run dev` (or `npm run dev:linux` on Linux)
2. Follow the same steps above — the app will open automatically

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
| Code Viewer | Monaco Editor 4 |
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

## Security

Found a vulnerability? Please see our [Security Policy](SECURITY.md).

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md).
