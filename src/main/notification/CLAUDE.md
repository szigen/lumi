# Notification System

Terminal bell detection and OS native notifications.

## How It Works
- Watches PTY output for BEL character (`\x07`)
- Throttled to 5 seconds per terminal to avoid spam
- When window is not focused: shows native OS `Notification` with click-to-focus
- Always sends `TERMINAL_BELL` IPC event to renderer (for toast notifications)

## Watch Out
- `removeTerminal()` must be called on terminal exit to clean up throttle tracking
- Notification click handler calls `window.show()` + `window.focus()` + sends `NOTIFICATION_CLICK` to renderer
- Bell detection is inline in `processPtyOutput` — no separate event listener needed
