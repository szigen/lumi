import { FolderOpen } from 'lucide-react'
import AdditionalPathsField from './AdditionalPathsField'
import type { Config } from '../../../shared/types'
import type { AIProvider } from '../../../shared/ai-provider'

interface Props {
  config: Config
  onChange: (updates: Partial<Config>) => void
}

export default function GeneralSection({ config, onChange }: Props) {
  const handleBrowse = async () => {
    const path = await window.api.openFolderDialog()
    if (path) {
      onChange({ projectsRoot: path })
    }
  }

  return (
    <div className="settings-section">
      <h3 className="settings-section__title">General</h3>
      <p className="settings-section__desc">Core application settings.</p>

      <div className="settings-field">
        <label className="settings-label">Projects Root</label>
        <p className="settings-hint">Directory where your repositories are located.</p>
        <div className="settings-path-input">
          <input
            type="text"
            className="settings-input"
            value={config.projectsRoot}
            onChange={(e) => onChange({ projectsRoot: e.target.value })}
          />
          <button className="settings-browse-btn" onClick={handleBrowse}>
            <FolderOpen size={14} />
            Browse
          </button>
        </div>
      </div>

      <AdditionalPathsField
        paths={config.additionalPaths}
        projectsRoot={config.projectsRoot}
        onChange={(paths) => onChange({ additionalPaths: paths })}
      />

      <div className="settings-field">
        <label className="settings-label">AI Provider</label>
        <p className="settings-hint">Select which assistant CLI to use across terminals and bug tools.</p>
        <div className="settings-theme-options">
          {(['claude', 'codex'] as AIProvider[]).map((provider) => (
            <button
              key={provider}
              className={`settings-theme-btn ${config.aiProvider === provider ? 'settings-theme-btn--active' : ''}`}
              onClick={() => onChange({ aiProvider: provider })}
            >
              {provider === 'codex' ? 'Codex' : 'Claude'}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-field">
        <label className="settings-label">Theme</label>
        <p className="settings-hint">Application color theme.</p>
        <div className="settings-theme-options">
          <button
            className={`settings-theme-btn ${config.theme === 'dark' ? 'settings-theme-btn--active' : ''}`}
            onClick={() => onChange({ theme: 'dark' })}
          >
            Dark
          </button>
          <button
            className="settings-theme-btn settings-theme-btn--disabled"
            disabled
            title="Coming soon"
          >
            Light
          </button>
        </div>
      </div>
    </div>
  )
}
