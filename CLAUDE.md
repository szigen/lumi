# AI Orchestrator

Electron desktop dashboard for managing multiple Claude Code CLI instances.

## Tech Stack
Electron 40, React 19, Zustand 5, Custom CSS (BEM), Framer Motion 12, xterm.js 6, node-pty, simple-git, Vite 7

## Commands
- `npm run dev` — development mode
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript check

## Rules
- When working in a directory, check for CLAUDE.md first and read it before modifying files.
- After making changes in a directory that has a CLAUDE.md, update that CLAUDE.md to reflect the changes (new files, renamed exports, changed behavior, etc.).
- When executing plans with superpowers:executing-plan, don't commit, don't wait for feedback, do full implementation. User will test in the end.

## Style Conventions
- CSS variables for theming (`--bg-deep`, `--accent-primary`, etc.)
- BEM naming for CSS classes
- Framer Motion for animations (`motion.div`)
- Lucide React for icons
- Components use barrel exports via `index.ts`
