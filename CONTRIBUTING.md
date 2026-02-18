# Contributing to Lumi

Thanks for your interest in contributing! Here's how to get started.

## Prerequisites

- **Node.js 22+** (required by Vite 7 — `crypto.hash()` API)
- **Git**
- At least one AI CLI installed and authenticated ([Claude Code](https://code.claude.com/docs/en/setup) or [OpenAI Codex](https://github.com/openai/codex))

### Platform-specific Requirements

<details>
<summary><strong>macOS</strong></summary>

- **Xcode Command Line Tools** (required for native `node-pty` compilation):
  ```bash
  xcode-select --install
  ```

</details>

<details>
<summary><strong>Linux</strong></summary>

- **Build tools** for native compilation:
  ```bash
  sudo apt install build-essential python3
  ```
- If you get a sandbox error during development, use `npm run dev:linux` instead of `npm run dev`

</details>

<details>
<summary><strong>Windows</strong></summary>

- **Visual Studio Build Tools** with "Desktop development with C++" workload:
  [Download VS Build Tools](https://visualstudio.microsoft.com/downloads/)

</details>

## Development Setup

```bash
git clone https://github.com/szigen/lumi.git
cd lumi
npm install
npm run dev        # macOS / Windows
npm run dev:linux  # Linux (sandbox disabled)
```

## Before Submitting a PR

1. **Run the linter**: `npm run lint`
2. **Run type checking**: `npm run typecheck`
3. **Run tests**: `npm test`
4. **Test your changes** by running the app with `npm run dev`

> If your PR adds new functionality, consider adding tests for it.

## Scout Rule

Leave the code cleaner than you found it. When working on a file, fix existing lint errors, unused imports/variables, and small code smells you encounter along the way.

## Code Style

- TypeScript strict mode
- Functional React components with hooks
- Zustand for state management
- Custom CSS with CSS variables and BEM naming (no inline styles)
- Framer Motion for animations
- Lucide React for icons

## Project Architecture

- **Main process** (`src/main/`): Electron backend — terminal management, git operations, action/persona loading
- **Preload** (`src/preload/`): Secure IPC bridge between main and renderer
- **Renderer** (`src/renderer/`): React UI — components, stores, hooks
- **Shared** (`src/shared/`): Types and constants shared across processes

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add dark mode toggle
fix: terminal resize on window change
refactor: extract git operations to RepoManager
```

## Pull Requests

- Keep PRs focused on a single concern
- Reference related issues in the PR description
- Ensure CI checks pass before requesting review
- Add a brief description of what changed and why

## Reporting Issues

When reporting a bug, please include:

- OS and version
- Node.js version
- Steps to reproduce
- Expected vs actual behavior

## Adding Actions or Personas

- Place YAML files in `default-actions/` or `default-personas/`
- Follow the existing YAML schema
- Test by running the app and triggering the action/persona
