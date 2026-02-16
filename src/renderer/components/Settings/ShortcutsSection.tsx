const isMac = window.api.platform === 'darwin'
const mod = isMac ? '⌘' : 'Ctrl+Shift'

const SHORTCUTS = [
  { keys: `${mod}+T`, action: 'New Terminal' },
  { keys: `${mod}+W`, action: 'Close Terminal' },
  { keys: `${mod}+O`, action: 'Open Repository' },
  { keys: `${mod}+B`, action: 'Toggle Left Sidebar' },
  { keys: isMac ? '⌘ ⇧ B' : 'Ctrl+Shift+J', action: 'Toggle Right Sidebar' },
  { keys: isMac ? '⌘ 1-9' : 'Ctrl+Shift+1-9', action: 'Switch to Tab N' },
  { keys: isMac ? '⌘ ⇧ ←' : 'Ctrl+Shift+←', action: 'Previous Terminal' },
  { keys: isMac ? '⌘ ⇧ →' : 'Ctrl+Shift+→', action: 'Next Terminal' },
  { keys: `${mod}+,`, action: 'Settings' },
  { keys: isMac ? '⌘ ⇧ F' : 'Ctrl+Shift+F', action: 'Focus Mode' },
]

export default function ShortcutsSection() {
  return (
    <div className="settings-section">
      <h3 className="settings-section__title">Keyboard Shortcuts</h3>
      <p className="settings-section__desc">Available keyboard shortcuts in the application.</p>
      <div className="shortcuts-list">
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.keys} className="shortcut-item">
            <kbd className="shortcut-keys">{shortcut.keys}</kbd>
            <span className="shortcut-action">{shortcut.action}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
