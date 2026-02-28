const isMac = window.api.platform === 'darwin'

interface Shortcut {
  keys: string[][]
  action: string
}

const SHORTCUTS: Shortcut[] = [
  { keys: isMac ? [['⌘', 'T']] : [['Ctrl', 'Shift', 'T']], action: 'New Terminal' },
  { keys: isMac ? [['⌘', 'W']] : [['Ctrl', 'Shift', 'W']], action: 'Close Terminal' },
  { keys: isMac ? [['⌘', 'O']] : [['Ctrl', 'Shift', 'O']], action: 'Open Repository' },
  { keys: isMac ? [['⌘', 'B']] : [['Ctrl', 'Shift', 'B']], action: 'Toggle Left Sidebar' },
  { keys: isMac ? [['⌘', '⇧', 'B']] : [['Ctrl', 'Shift', 'J']], action: 'Toggle Right Sidebar' },
  { keys: isMac ? [['⌘', '1'], ['⌘', '9']] : [['Ctrl', 'Shift', '1'], ['Ctrl', 'Shift', '9']], action: 'Switch to Tab N' },
  { keys: isMac ? [['⌘', '⇧', '←']] : [['Ctrl', 'Shift', '←']], action: 'Previous Terminal' },
  { keys: isMac ? [['⌘', '⇧', '→']] : [['Ctrl', 'Shift', '→']], action: 'Next Terminal' },
  { keys: isMac ? [['⌘', ',']] : [['Ctrl', 'Shift', ',']], action: 'Settings' },
  { keys: isMac ? [['⌘', '⇧', 'F']] : [['Ctrl', 'Shift', 'F']], action: 'Focus Mode' },
  { keys: isMac ? [['⌘', 'Q']] : [['Ctrl', 'Shift', 'Q']], action: 'Quit' },
]

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <span className="shortcut-combo">
      {keys.map((key, i) => (
        <kbd key={i} className="shortcut-kbd" data-modifier={key.length === 1 && /[⌘⇧⌥⌃]/.test(key) ? '' : undefined}>
          {key}
        </kbd>
      ))}
    </span>
  )
}

export default function ShortcutsSection() {
  return (
    <div className="settings-section">
      <h3 className="settings-section__title">Keyboard Shortcuts</h3>
      <p className="settings-section__desc">Available keyboard shortcuts in the application.</p>
      <div className="shortcuts-list">
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.action} className="shortcut-item">
            <span className="shortcut-action">{shortcut.action}</span>
            <span className="shortcut-keys">
              {shortcut.keys.map((combo, i) => (
                <span key={i} className="shortcut-keys__group">
                  {i > 0 && <span className="shortcut-keys__separator">–</span>}
                  <KeyCombo keys={combo} />
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
