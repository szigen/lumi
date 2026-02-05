import type { Config } from '../../../shared/types'

interface Props {
  config: Config
  onChange: (updates: Partial<Config>) => void
}

export default function TerminalSection({ config, onChange }: Props) {
  return (
    <div className="settings-section">
      <h3 className="settings-section__title">Terminal</h3>
      <p className="settings-section__desc">Terminal emulator settings.</p>

      <div className="settings-field">
        <label className="settings-label">Max Terminals</label>
        <p className="settings-hint">Maximum number of terminal sessions allowed (1-20).</p>
        <input
          type="number"
          className="settings-input settings-input--small"
          min={1}
          max={20}
          value={config.maxTerminals}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10)
            if (val >= 1 && val <= 20) onChange({ maxTerminals: val })
          }}
        />
      </div>

      <div className="settings-field">
        <label className="settings-label">Font Size</label>
        <p className="settings-hint">Terminal font size in pixels (10-24).</p>
        <input
          type="number"
          className="settings-input settings-input--small"
          min={10}
          max={24}
          value={config.terminalFontSize}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10)
            if (val >= 10 && val <= 24) onChange({ terminalFontSize: val })
          }}
        />
      </div>
    </div>
  )
}
