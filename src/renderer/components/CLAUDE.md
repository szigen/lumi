# UI Components

React component library for the dashboard.

## Structure
Each component lives in its own directory with a barrel export (`index.ts`).

## Key Conventions
- Animations: Framer Motion (`motion.div`, `AnimatePresence`).
- Icons: `lucide-react`.
- Styles: BEM naming and existing design tokens.
- Terminal-related UI should treat main process as source of truth; spawn/kill flows must reconcile via terminal snapshot sync rather than optimistic local inserts.

## FileViewer
- `FileViewerModal` — modal overlay mounted in Layout, uses Framer Motion for animation.
- Three modes: `view` (read-only Monaco), `diff` (Monaco DiffEditor), `commit-diff` (file list sidebar + diff).
- State managed by `fileViewer` slice in `useAppStore`.
- Triggered from: ProjectContext file click, FileChangeItem hover eye icon, BranchSection commit click.

## SearchInput
- `SearchInput` — reusable search/filter input in `ui/SearchInput.tsx` with clear button, ESC-to-close, and optional `onBlur` callback.
- Used in `ProjectContext` header to filter the file tree by filename. Search toggle uses CSS-only crossfade (no Framer Motion) via `__content` wrapper with absolute-positioned `__search` overlay.
- `filterTree` and `collectAllDirPaths` utilities live in `ProjectContext.tsx` for tree filtering and auto-expand.

## Watch Out
- `Layout` owns terminal IPC bridge lifecycle so terminal output continues across view switches.
- Terminal cards remain mounted per repo switch (`display: none`) to preserve xterm session state.
