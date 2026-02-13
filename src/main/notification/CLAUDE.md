# Notification System

Status-driven terminal notifications via OS native notifications and renderer toasts.

## How It Works
- Listens to StatusStateMachine state transitions (via `notifyStatusChange`)
- `waiting-unseen`: immediate notification + repeat every 60 seconds
- `waiting-seen`: repeat every 5 minutes (no immediate notification on transition)
- `waiting-focused`: no notifications (user is looking at the terminal)
- `error`: single notification, no repeat
- `working` / `idle`: clears any active interval
- When window is not focused: shows native OS `Notification` with click-to-focus
- Always sends `TERMINAL_BELL` IPC event to renderer (for toast notifications)

## Watch Out
- `removeTerminal()` must be called on terminal exit to clean up intervals and context
- Notification click handler calls `window.show()` + `window.focus()` + sends `NOTIFICATION_CLICK` to renderer
- Does NOT scan PTY output for BEL — all triggering comes from status machine
- Intervals are per-terminal and auto-clear on state change
