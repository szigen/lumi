const mod = window.api.platform === 'darwin' ? '⌘' : 'Alt'

const SHORTCUTS = [
  { keys: `${mod} T`, action: 'New Terminal' },
  { keys: `${mod} W`, action: 'Close Terminal' },
  { keys: `${mod} O`, action: 'Open Repository' },
  { keys: `${mod} B`, action: 'Toggle Left Sidebar' },
  { keys: `${mod} ⇧ B`, action: 'Toggle Right Sidebar' },
  { keys: `${mod} 1-9`, action: 'Switch to Tab N' },
  { keys: `${mod} ⇧ ←`, action: 'Previous Terminal' },
  { keys: `${mod} ⇧ →`, action: 'Next Terminal' },
  { keys: `${mod} ,`, action: 'Settings' },
  { keys: `${mod} ⇧ F`, action: 'Focus Mode' },
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
