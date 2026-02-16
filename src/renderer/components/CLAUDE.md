# UI Components

React component library for the dashboard.

## Structure
Each component lives in its own directory with a barrel export (`index.ts`).

## Key Conventions
- Animations: Framer Motion (`motion.div`, `AnimatePresence`).
- Icons: `lucide-react`.
- Styles: BEM naming and existing design tokens.
- Terminal-related UI should treat main process as source of truth; spawn/kill flows must reconcile via terminal snapshot sync rather than optimistic local inserts.

## Watch Out
- `Layout` owns terminal IPC bridge lifecycle so terminal output continues across view switches.
- Terminal cards remain mounted per repo switch (`display: none`) to preserve xterm session state.
- BugTracker fix terminal controls should sync terminal state after kill/apply actions.
