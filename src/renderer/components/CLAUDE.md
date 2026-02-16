# UI Components

React component library for the dashboard.

## Structure
Each component lives in its own directory with barrel export (`index.ts`). Major areas:
- **Header** — top bar with repo selector, tabs, window controls
- **LeftSidebar** — quick actions, session list, codename collection progress, project file tree, context menu
- **RightSidebar** — branch list, file changes, commit tree
- **TerminalPanel** — terminal grid container, persona dropdown for spawn
- **Terminal** — xterm.js wrapper per session. Logic split into custom hooks (`hooks/`), constants (`constants.ts`), and utils (`utils.ts`)
- **FocusMode / FocusHoverBar** — distraction-free terminal view
- **Settings** — modal with tabbed navigation (General, Terminal, Appearance, Shortcuts). GeneralSection delegates Additional Paths CRUD to `AdditionalPathsField` child component.
- **Setup** — multi-step onboarding wizard (welcome, system checks, projects root, ready). Wizard orchestrator in `SetupScreen.tsx`, step registry in `steps.ts`, step components in `steps/`, shared types in `types.ts`
- **QuitDialog** — confirmation when closing with active terminals
- **Notifications** — toast container with type-based styling (bell, error, success, info)
- **BugTracker** — repo-scoped bug tracker with Claude integration. Split-panel: left has BugList, FixList, ClaudeInput; right has FixTerminal. Components: BugTracker (shell), BugList, BugForm, FixList, FixCard, ClaudeInput, FixTerminal
- **WorkflowPanel** — workflow management UI
- **ui/** — reusable primitives (Button, Badge, Card, IconButton, EmptyState)
- **Layout** — app shell; connects/disconnects global terminal event bridge so terminal IPC listeners survive view switches

## Conventions
- Animations via Framer Motion (`motion.div`, `AnimatePresence`)
- Icons from `lucide-react`
- Glass-morphism via `backdrop-filter: blur()` + semi-transparent backgrounds
- BEM CSS class naming (e.g., `.terminal-card__header`, `.repo-tab--active`)
- macOS: header has `80px` left padding for traffic lights, `-webkit-app-region: drag`
