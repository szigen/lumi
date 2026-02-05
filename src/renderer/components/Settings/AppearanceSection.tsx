import type { UIState } from '../../../shared/types'

interface Props {
  uiDefaults: Pick<UIState, 'leftSidebarOpen' | 'rightSidebarOpen'>
  onChange: (updates: Partial<Pick<UIState, 'leftSidebarOpen' | 'rightSidebarOpen'>>) => void
}

export default function AppearanceSection({ uiDefaults, onChange }: Props) {
  return (
    <div className="settings-section">
      <h3 className="settings-section__title">Appearance</h3>
      <p className="settings-section__desc">Default layout preferences on startup.</p>

      <div className="settings-field">
        <div className="settings-toggle-row">
          <div>
            <label className="settings-label">Left Sidebar</label>
            <p className="settings-hint">Show left sidebar by default on startup.</p>
          </div>
          <button
            className={`settings-toggle ${uiDefaults.leftSidebarOpen ? 'settings-toggle--on' : ''}`}
            onClick={() => onChange({ leftSidebarOpen: !uiDefaults.leftSidebarOpen })}
          >
            <span className="settings-toggle__thumb" />
          </button>
        </div>
      </div>

      <div className="settings-field">
        <div className="settings-toggle-row">
          <div>
            <label className="settings-label">Right Sidebar</label>
            <p className="settings-hint">Show right sidebar (commits) by default on startup.</p>
          </div>
          <button
            className={`settings-toggle ${uiDefaults.rightSidebarOpen ? 'settings-toggle--on' : ''}`}
            onClick={() => onChange({ rightSidebarOpen: !uiDefaults.rightSidebarOpen })}
          >
            <span className="settings-toggle__thumb" />
          </button>
        </div>
      </div>
    </div>
  )
}
