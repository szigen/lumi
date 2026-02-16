# Repository Guidelines

## Project Structure & Module Organization
- `src/main/`: Electron main process (window lifecycle, terminals, git/actions/personas, IPC handlers).
- `src/preload/`: secure `contextBridge` API between main and renderer.
- `src/renderer/`: React UI (`components/`, `stores/`, `hooks/`, `styles/`).
- `src/shared/`: shared types, constants, and IPC channel definitions.
- `default-actions/` and `default-personas/`: seeded YAML templates shipped with the app.
- `docs/plans/`: design notes and implementation plans.
- `dist/` and `out/` are generated build artifacts; do not edit them directly.

## Build, Test, and Development Commands
- `npm run dev`: launch Electron + Vite in development with HMR.
- `npm run dev:linux`: Linux dev mode with sandbox-related flags.
- `npm run build`: production build via `electron-vite`.
- `npm run preview`: preview the built application.
- `npm run lint`: run ESLint on `src/`.
- `npm run lint:fix`: apply safe lint auto-fixes.
- `npm run typecheck`: TypeScript check (`tsc --noEmit`).
- `npm run build:mac|build:win|build:linux|build:all`: package distributables with `electron-builder`.

## Coding Style & Naming Conventions
- Stack: TypeScript (strict mode), React function components, Zustand stores.
- Follow existing formatting: 2-space indentation, single quotes, and no semicolons.
- Naming:
  - Components/classes: `PascalCase` (e.g., `SettingsModal.tsx`, `TerminalManager.ts`).
  - Hooks/stores: `useXxx` (e.g., `useTerminalStore.ts`, `useKeyboardShortcuts.ts`).
  - Shared constants/types: keep in `src/shared/`.
- CSS uses variables and BEM-style class naming (`src/renderer/styles/globals.css`).
- No Prettier config is committed; ESLint is the primary style gate.

## Testing Guidelines
- There is no committed automated test runner yet (`*.test` / `*.spec` files are currently absent).
- Minimum validation before opening a PR:
  1. `npm run lint`
  2. `npm run typecheck`
  3. `npm run dev` and manually verify affected UI/terminal flows.
- If adding tests, colocate with the feature and use `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines
- Keep commit subjects short, imperative, and specific (matching history such as `Add ...`, `Fix ...`, `Remove ...`).
- Keep commits focused; avoid mixing refactors with behavior changes.
- PRs should include:
  - what changed and why
  - linked issue (if available)
  - manual verification steps
  - screenshots/GIFs for renderer UI changes

## Security & Configuration Tips
- Required runtime: Node.js `>=22`.
- Do not commit secrets or local machine config (`.env*`, `.claude/settings.local.json`).
- User data/config is stored in `~/.ai-orchestrator` (or `%APPDATA%/ai-orchestrator` on Windows); avoid hardcoded local paths.
