import { useState } from 'react'
import { FolderOpen, FolderGit2, X, Pencil, Check } from 'lucide-react'
import type { AdditionalPath } from '../../../shared/types'

interface Props {
  paths: AdditionalPath[]
  projectsRoot: string
  onChange: (paths: AdditionalPath[]) => void
}

export default function AdditionalPathsField({ paths, projectsRoot, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')

  const addPath = async (type: 'root' | 'repo') => {
    const selectedPath = await window.api.openFolderDialog()
    if (!selectedPath) return

    if (selectedPath === projectsRoot) return
    if (paths.some((p) => p.path === selectedPath)) return

    const newPath: AdditionalPath = {
      id: crypto.randomUUID(),
      path: selectedPath,
      type
    }
    onChange([...paths, newPath])
  }

  const removePath = (id: string) => {
    onChange(paths.filter((p) => p.id !== id))
  }

  const startEditLabel = (ap: AdditionalPath) => {
    setEditingId(ap.id)
    setEditLabel(ap.label || '')
  }

  const saveLabel = (id: string) => {
    onChange(
      paths.map((p) =>
        p.id === id ? { ...p, label: editLabel || undefined } : p
      )
    )
    setEditingId(null)
  }

  const getShortPath = (fullPath: string) => {
    const parts = fullPath.split('/')
    if (parts.length <= 3) return fullPath
    return '.../' + parts.slice(-2).join('/')
  }

  return (
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

      {paths.length > 0 && (
        <div className="additional-paths__list">
          {paths.map((ap) => (
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
  )
}
