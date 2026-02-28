# Notification System

Status-driven terminal notifications via OS native notifications and renderer toasts.

## How It Works
- Listens to StatusStateMachine state transitions (via `notifyStatusChange`)
- `waiting-unseen`: immediate notification + repeat at configurable interval (default 1 min)
- `waiting-seen`: repeat at configurable interval (default 5 min, no immediate notification on transition)
- `waiting-focused`: no notifications (user is looking at the terminal)
- `error`: single notification, no repeat
- `working` / `idle`: clears any active interval
- When window is not focused: shows native OS `Notification` with click-to-focus
- Always sends `TERMINAL_BELL` IPC event to renderer (for toast notifications)
- `updateSettings(NotificationSettings)`: dynamically updates intervals and enabled flags, re-creates active intervals for tracked terminals
- Settings propagated from config via IPC on startup and CONFIG_SET changes

## Watch Out
- `removeTerminal()` must be called on terminal exit to clean up intervals and context
- Notification click handler calls `window.show()` + `window.focus()` + sends `NOTIFICATION_CLICK` to renderer
- Does NOT scan PTY output for BEL — all triggering comes from status machine
- Intervals are per-terminal and auto-clear on state change
