# Platform Abstraction Layer

Centralizes all platform-specific logic for cross-platform support.

## Files
- **index.ts** — Platform detection (`isMac`, `isWin`, `isLinux`) + re-exports
- **shellEnv.ts** — `fixProcessPath()` enriches `process.env.PATH` at startup by spawning a login shell (`zsh -ilc`) and adding well-known CLI directories (`~/.local/bin`, `/usr/local/bin`, `/opt/homebrew/bin`). Fixes Electron's restricted PATH when launched from Dock/Finder. Called in `main/index.ts` before `autoFixSpawnHelper()`.
- **shell.ts** — `getDefaultShell()`, `getShellArgs()` with per-platform fallback chains (macOS: zsh->bash->sh, Windows: powershell->cmd, Linux: bash->zsh->sh). Caches result after first resolution. `getShellArgs()` returns `['-l']` on macOS/Linux for login shell (loads user profile/PATH).
- **window.ts** — `getWindowConfig()` returns BrowserWindow options (macOS: hiddenInset + trafficLightPosition, Windows: hidden + titleBarOverlay with native controls, Linux: hidden without titleBarOverlay — overlay is unstable on Wayland/tiling WMs)
- **paths.ts** — `getConfigDir()` returns platform-appropriate config directory (macOS/Linux: ~/.lumi, Windows: %APPDATA%/lumi)
- **systemChecks.ts** — `getPlatformChecks()` returns platform-specific health checks (macOS: spawn-helper, Windows: ConPTY version). `autoFixSpawnHelper()` silently fixes spawn-helper execute permissions at startup (called from `main/index.ts` before IPC setup). Uses `app.getAppPath()` for path resolution (works in both dev and production/asar builds).

## Rules
- All platform-specific logic MUST go through this module — never use inline `process.platform` checks elsewhere
- Shell detection uses `which`/`where` with try/catch fallback chain
- Config dir on Windows uses `%APPDATA%` (via `process.env.APPDATA` with fallback to `~/AppData/Roaming`)

## Watch Out
- `getDefaultShell()` caches the result — restart app if shell environment changes
- Windows ConPTY check requires build 17763+ (Windows 10 1809)
