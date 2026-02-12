# Header Component

Top bar with repo tabs, repo selector dropdown, and window controls.

## Files
- **Header.tsx** — Layout orchestration: tab list, sidebar toggles, settings/focus buttons
- **RepoTab.tsx** — Single tab: name display, active state, close button
- **RepoSelector.tsx** — Dropdown: search filter, grouped repo list, keyboard navigation (arrow keys, Enter, Escape)

## Store Dependencies
- `useAppStore` — `openTabs`, `activeTab`, `collapsedGroups`; calls `setActiveTab`, `closeTab`, `toggleLeftSidebar`, `toggleRightSidebar`, `openSettings`, `enterFocusMode`
- `useRepoStore` (RepoSelector) — `repos`, `additionalPaths`; calls `loadRepos`, `groupReposBySource`

## Watch Out
- RepoSelector rendered via `createPortal(dropdown, document.body)` — lives outside Header DOM tree
- Click-outside detection needs both trigger ref and dropdown ref to be valid
- RepoTab close uses `e.stopPropagation()` to prevent tab selection when closing
- Listens for `open-repo-selector` event (triggered by Cmd+O shortcut)
- macOS: 80px left padding for traffic lights, `-webkit-app-region: drag` on header
