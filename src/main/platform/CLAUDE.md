# Platform Abstraction Layer

Centralizes all platform-specific logic for cross-platform support.

## Files
- **index.ts** — Platform detection (`isMac`, `isWin`, `isLinux`) + re-exports
- **shell.ts** — `getDefaultShell()`, `getShellArgs()` with per-platform fallback chains (macOS: zsh->bash->sh, Windows: powershell->cmd, Linux: bash->zsh->sh). Caches result after first resolution.
- **window.ts** — `getWindowConfig()` returns BrowserWindow options (macOS: hiddenInset + trafficLightPosition, Windows: hidden + titleBarOverlay with native controls, Linux: hidden without titleBarOverlay — overlay is unstable on Wayland/tiling WMs)
- **paths.ts** — `getConfigDir()` returns platform-appropriate config directory (macOS/Linux: ~/.lumi, Windows: %APPDATA%/lumi)
- **systemChecks.ts** — `getPlatformChecks()` returns platform-specific health checks (macOS: spawn-helper, Windows: ConPTY version)

## Rules
- All platform-specific logic MUST go through this module — never use inline `process.platform` checks elsewhere
- Shell detection uses `which`/`where` with try/catch fallback chain
- Config dir on Windows uses `%APPDATA%` (via `process.env.APPDATA` with fallback to `~/AppData/Roaming`)

## Watch Out
- `getDefaultShell()` caches the result — restart app if shell environment changes
- Windows ConPTY check requires build 17763+ (Windows 10 1809)
