# Settings Component

Modal with tabbed navigation for app configuration.

## Files
- **SettingsModal.tsx** — Container: tab switching, config/UI state loading, save/cancel
- **GeneralSection.tsx** — Projects root path, theme selection, delegates additional paths to child
- **TerminalSection.tsx** — Max terminals slider, font size control
- **AppearanceSection.tsx** — Sidebar default open/close toggles
- **NotificationsSection.tsx** — Notification toggles (unseen/seen) with frequency inputs
- **ShortcutsSection.tsx** — Read-only keyboard shortcut reference
- **AdditionalPathsField.tsx** — CRUD for additional scan paths (add root/repo, edit label, remove)

## Store Dependencies
- `useAppStore` — reads `settingsOpen`, calls `closeSettings()`
- All config read/write via `window.api.getConfig()` / `setConfig()` (no direct store for config)

## Watch Out
- Config loads only when modal opens (`if (!settingsOpen) return`) — not on mount
- `hasChanges` flag disables Save button until user modifies something; reset after save
- Escape key listener added/removed in `useEffect` tied to modal open state
- AdditionalPathsField prevents duplicate paths and overlap with projectsRoot
- Sections receive config via props + `onChange` callbacks — no direct store writes from sections
