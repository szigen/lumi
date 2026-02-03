import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'

export default function ProjectContext() {
  const [files, setFiles] = useState<string[]>([])
  const [expanded, setExpanded] = useState(true)
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null

  useEffect(() => {
    if (activeRepo) {
      window.api.getRepoFiles(activeRepo.path).then(setFiles)
    } else {
      setFiles([])
    }
  }, [activeRepo])

  const directories = files.filter(f => f.endsWith('/'))
  const regularFiles = files.filter(f => !f.endsWith('/'))

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2 flex items-center gap-1"
      >
        <span>{expanded ? '▼' : '▶'}</span>
        Project Context
      </button>

      {expanded && (
        <div className="max-h-48 overflow-y-auto">
          {!activeRepo ? (
            <p className="text-text-secondary text-sm px-2">No repo selected</p>
          ) : files.length === 0 ? (
            <p className="text-text-secondary text-sm px-2">Loading...</p>
          ) : (
            <ul className="text-sm space-y-0.5">
              {directories.slice(0, 10).map((file) => (
                <li key={file} className="px-2 text-text-secondary flex items-center gap-1">
                  <span>📁</span>
                  <span className="truncate">{file}</span>
                </li>
              ))}
              {regularFiles.slice(0, 10).map((file) => (
                <li key={file} className="px-2 text-text-secondary flex items-center gap-1">
                  <span>📄</span>
                  <span className="truncate">{file}</span>
                </li>
              ))}
              {files.length > 20 && (
                <li className="px-2 text-text-secondary text-xs">
                  ... and {files.length - 20} more
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
