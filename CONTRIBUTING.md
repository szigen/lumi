# Contributing to Lumi

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/szigen/lumi.git
cd lumi
npm install
npm run dev
```

## Before Submitting a PR

1. **Run the linter**: `npm run lint`
2. **Run type checking**: `npm run typecheck`
3. **Test your changes** by running the app with `npm run dev`

## Code Style

- TypeScript strict mode
- Functional React components with hooks
- Zustand for state management
- Custom CSS with CSS variables and BEM naming (no inline styles)
- Framer Motion for animations

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
