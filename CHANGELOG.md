# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.9] - 2026-02-28

### Added

- External link handling — terminal URLs and in-app navigation open in the system default browser

### Changed

- xterm WebLinksAddon uses IPC-based `openExternal` instead of default behavior

## [0.1.8] - 2026-02-28

### Added

- Configurable notification settings with separate intervals for seen/unseen notifications
- Action description tooltips with info icon in actions panel

### Changed

- Improved startup logic and enhanced ErrorBoundary error UI
- Better ShortcutsSection grid layout and styling

### Removed

- BugTracker feature entirely (components, parsers, store, IPC handlers)

### Fixed

- Settings modal height constraint
- Shortcuts grid layout alignment

## [0.1.6] - 2026-02-27

### Added

- macOS code signing with Developer ID Application certificate
- Apple notarization via GitHub Actions release workflow

### Fixed

- Ctrl+Shift+V paste handler uses isPasting lock to prevent keystroke ordering
- syncFromMain queues re-syncs instead of dropping concurrent requests
- setProjectGridLayout debounced to prevent concurrent IPC writes
- loadUIState ordering — loadRepos must complete first
- GridLayoutPopup uses selectors to avoid re-render loops
- acceptFirstMouse restricted to macOS only

## [0.1.5] - 2026-02-27

### Fixed

- Prevent infinite re-render loop in getActiveGridLayout (#11)

## [0.1.4] - 2026-02-26

### Added

- Per-project grid layouts with GridLayoutPopup
- New Bash option in persona dropdown for plain terminal sessions
- Fullscreen detection with adjusted macOS padding

### Changed

- Use safeSend for renderer IPC to prevent send-after-destroy crashes
- Enable acceptFirstMouse for main window (click-through on macOS focus)

### Fixed

- Prevent double paste on Ctrl+Shift+V in Windows/Linux terminals

## [0.1.3] - 2026-02-19

### Changed

- Reduced build size ~40% — moved renderer-only deps to devDependencies, bundled main process deps, converted mascot images to WebP, compressed build icon
- Explicit asar/asarUnpack config in electron-builder

## [0.1.2] - 2026-02-18

### Changed

- Cleaned up workspace pollution and optimized loading mascot
- Switched contact method to GitHub Issues
- Refreshed documentation and community policies (CONTRIBUTING, CODE_OF_CONDUCT, SECURITY)

## [0.1.1] - 2026-02-18

### Fixed

- Electron PATH resolution for native CLI detection on macOS
- node-pty spawn-helper checks — removed unreliable auto-fix logic
- README and package.json metadata for open-source readiness
- Download links in README updated to v0.1.1

### Added

- Ctrl+Shift+C/V copy/paste support for Windows/Linux terminals
- Per-platform installation guide with download table in README

### Changed

- CI workflow limited to release PRs and manual trigger to save action minutes

## [0.1.0] - 2026-02-18

### Added

- Initial open-source release
- Multi-terminal AI session management (up to 20 sessions, default 12)
- Multi-provider support: Claude Code and OpenAI Codex CLI
- YAML-based action system with AI-assisted editing and auto-backup history
- Persona system with built-in personas (Architect, Expert, Fixer, Reviewer)
- Git integration: branch management, reactive file-changes view, commit history
- Multi-repo support with tab-based navigation
- Terminal codenames (e.g., "brave-alpaca")
- Smart terminal status detection via OSC9 signals
- Platform-adaptive keyboard shortcuts (Cmd on macOS, Ctrl+Shift on Windows/Linux)
- Native OS notifications for terminal bell and activity detection
- Monaco Editor integration for code viewing
