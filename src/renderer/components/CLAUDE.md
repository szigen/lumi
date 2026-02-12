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
- **Setup** — first-run setup screen for selecting projects root folder
- **QuitDialog** — confirmation when closing with active terminals
- **Notifications** — toast container
- **WorkflowPanel** — workflow management UI
- **ui/** — reusable primitives (Button, Badge, Card, IconButton, EmptyState)

## Conventions
- Animations via Framer Motion (`motion.div`, `AnimatePresence`)
- Icons from `lucide-react`
- Glass-morphism via `backdrop-filter: blur()` + semi-transparent backgrounds
- BEM CSS class naming (e.g., `.terminal-card__header`, `.repo-tab--active`)
- macOS: header has `80px` left padding for traffic lights, `-webkit-app-region: drag`
