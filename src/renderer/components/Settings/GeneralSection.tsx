import { useState } from 'react'
import { FolderOpen, FolderGit2, X, Pencil, Check } from 'lucide-react'
import type { Config, AdditionalPath } from '../../../shared/types'

interface Props {
  config: Config
  onChange: (updates: Partial<Config>) => void
}

export default function GeneralSection({ config, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')

  const handleBrowse = async () => {
    const path = await window.api.openFolderDialog()
    if (path) {
      onChange({ projectsRoot: path })
    }
  }

  const addPath = async (type: 'root' | 'repo') => {
    const selectedPath = await window.api.openFolderDialog()
    if (!selectedPath) return

    // Validate: no duplicates
    if (selectedPath === config.projectsRoot) return
    if (config.additionalPaths.some((p) => p.path === selectedPath)) return

    const newPath: AdditionalPath = {
      id: crypto.randomUUID(),
      path: selectedPath,
      type
    }
    onChange({ additionalPaths: [...config.additionalPaths, newPath] })
  }

  const removePath = (id: string) => {
    onChange({ additionalPaths: config.additionalPaths.filter((p) => p.id !== id) })
  }

  const startEditLabel = (ap: AdditionalPath) => {
    setEditingId(ap.id)
    setEditLabel(ap.label || '')
  }

  const saveLabel = (id: string) => {
    onChange({
      additionalPaths: config.additionalPaths.map((p) =>
        p.id === id ? { ...p, label: editLabel || undefined } : p
      )
    })
    setEditingId(null)
  }

  const getShortPath = (fullPath: string) => {
    const parts = fullPath.split('/')
    if (parts.length <= 3) return fullPath
    return '.../' + parts.slice(-2).join('/')
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

      <div className="settings-field">
        <label className="settings-label">Additional Paths</label>
        <p className="settings-hint">Add extra root directories or standalone repositories.</p>
        <div className="additional-paths__actions">
          <button className="settings-browse-btn" onClick={() => addPath('root')}>
            <FolderOpen size={14} />
            Add Root Directory
          </button>
          <button className="settings-browse-btn" onClick={() => addPath('repo')}>
            <FolderGit2 size={14} />
            Add Repository
          </button>
        </div>

        {config.additionalPaths.length > 0 && (
          <div className="additional-paths__list">
            {config.additionalPaths.map((ap) => (
              <div key={ap.id} className="additional-paths__item">
                <span className={`additional-paths__badge additional-paths__badge--${ap.type}`}>
                  {ap.type === 'root' ? 'ROOT' : 'REPO'}
                </span>
                {editingId === ap.id ? (
                  <div className="additional-paths__edit">
                    <input
                      type="text"
                      className="settings-input additional-paths__label-input"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Label..."
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveLabel(ap.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <button
                      className="additional-paths__icon-btn"
                      onClick={() => saveLabel(ap.id)}
                    >
                      <Check size={12} />
                    </button>
                  </div>
                ) : (
                  <span className="additional-paths__path" title={ap.path}>
                    {ap.label || getShortPath(ap.path)}
                  </span>
                )}
                <div className="additional-paths__item-actions">
                  {editingId !== ap.id && (
                    <button
                      className="additional-paths__icon-btn"
                      onClick={() => startEditLabel(ap)}
                      title="Edit label"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                  <button
                    className="additional-paths__icon-btn additional-paths__icon-btn--danger"
                    onClick={() => removePath(ap.id)}
                    title="Remove"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
