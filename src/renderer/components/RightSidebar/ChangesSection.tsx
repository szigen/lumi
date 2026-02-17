import { useState, useMemo } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import FileChangeItem from './FileChangeItem'

export default function ChangesSection() {
  const [commitMessage, setCommitMessage] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)
  const { activeTab } = useAppStore()
  const {
    getRepoByName,
    changes,
    selectedFiles,
    toggleFile,
    selectAll,
    deselectAll,
    commitChanges
  } = useRepoStore()

  const activeRepo = useMemo(
    () => (activeTab ? getRepoByName(activeTab) : null),
    [activeTab, getRepoByName]
  )

  const repoChanges = useMemo(
    () => (activeRepo ? changes.get(activeRepo.path) || [] : []),
    [activeRepo, changes]
  )

  const repoSelected = useMemo(
    () => (activeRepo ? selectedFiles.get(activeRepo.path) || new Set<string>() : new Set<string>()),
    [activeRepo, selectedFiles]
  )

  const allSelected = repoChanges.length > 0 && repoSelected.size === repoChanges.length
  const canCommit = repoSelected.size > 0 && commitMessage.trim().length > 0 && !isCommitting

  const handleToggleAll = () => {
    if (!activeRepo) return
    if (allSelected) {
      deselectAll(activeRepo.path)
    } else {
      selectAll(activeRepo.path)
    }
  }

  const handleCommit = async () => {
    if (!activeRepo || !canCommit) return

    setIsCommitting(true)
    const result = await commitChanges(activeRepo.path, commitMessage.trim())
    setIsCommitting(false)

    if (result.success) {
      setCommitMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canCommit) {
      handleCommit()
    }
  }

  if (repoChanges.length === 0) {
    return (
      <div className="changes-section">
        <p className="changes-empty">No uncommitted changes</p>
      </div>
    )
  }

  return (
    <div className="changes-section">
      <div className="changes-toolbar">
        <button className="changes-toggle-all" onClick={handleToggleAll}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleToggleAll}
            onClick={(e) => e.stopPropagation()}
          />
          <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
        </button>
        <span className="changes-count">{repoSelected.size}/{repoChanges.length}</span>
      </div>

      <div className="changes-file-list">
        {repoChanges.map((file) => (
          <FileChangeItem
            key={file.path}
            file={file}
            isSelected={repoSelected.has(file.path)}
            repoPath={activeRepo.path}
            onToggle={() => activeRepo && toggleFile(activeRepo.path, file.path)}
          />
        ))}
      </div>

      <div className="changes-commit">
        <input
          type="text"
          className="changes-commit__input"
          placeholder="Commit message..."
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isCommitting}
        />
        <button
          className="changes-commit__btn"
          onClick={handleCommit}
          disabled={!canCommit}
        >
          {isCommitting ? 'Committing...' : 'Commit'}
        </button>
      </div>
    </div>
  )
}
