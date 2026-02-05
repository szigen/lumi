const SHORTCUTS = [
  { keys: '⌘ T', action: 'New Terminal' },
  { keys: '⌘ W', action: 'Close Terminal' },
  { keys: '⌘ O', action: 'Open Repository' },
  { keys: '⌘ B', action: 'Toggle Left Sidebar' },
  { keys: '⌘ ⇧ B', action: 'Toggle Right Sidebar' },
  { keys: '⌘ 1-9', action: 'Switch to Tab N' },
  { keys: '⌘ ⇧ ←', action: 'Previous Terminal' },
  { keys: '⌘ ⇧ →', action: 'Next Terminal' },
  { keys: '⌘ ,', action: 'Settings' },
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
