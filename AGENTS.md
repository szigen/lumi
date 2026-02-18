# Lumi

Electron desktop dashboard for managing Claude/Codex CLI workflows across repositories.

## Tech Stack
Electron 40, React 19, Zustand 5, TypeScript (strict), xterm.js 6, node-pty, simple-git, Vite 7, electron-builder

## Commands
- `npm run dev` — development mode
- `npm run build` — production build
- `npm run lint` — ESLint on `src/`
- `npm run typecheck` — TypeScript check
- `npm run build:mac|build:win|build:linux|build:all` — distributable builds

## Agent Rules
- Always read root `CLAUDE.md` before making changes.
- Before editing in any directory, check for the nearest `CLAUDE.md` and follow it.
- Read other task-relevant markdown files before implementation.
  Examples: module `CLAUDE.md` files, `docs/plans/*.md`, and related feature docs.
- Keep context targeted: read only docs relevant to the task instead of bulk-loading all markdown files.
- If behavior/files change in a directory that has `CLAUDE.md`, update that `CLAUDE.md` in the same change.
- Keep diffs focused; avoid unrelated refactors.
- Do not edit generated artifacts directly (`dist/`, `out/`).
- Do not commit secrets or local machine config (`.env*`, `.claude/settings.local.json`).

## Style + Quality
- Use TypeScript strict patterns, React function components, and Zustand store conventions.
- Follow existing formatting: 2-space indentation, single quotes, no semicolons.
- Naming: `PascalCase` for components/classes, `useXxx` for hooks/stores.
- CSS: variables + BEM naming style.
- Leave touched code cleaner than found (small lint/code-smell fixes are encouraged).
- For code changes, validate with `npm run lint` and `npm run typecheck`.
