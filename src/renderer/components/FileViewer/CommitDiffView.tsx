import { useState } from 'react'
import { FileText } from 'lucide-react'
import type { CommitDiffFile } from '../../../shared/types'
import FileDiffView from './FileDiffView'

interface CommitDiffViewProps {
  files: CommitDiffFile[]
  commitHash: string
}

const STATUS_COLORS: Record<string, string> = {
  modified: 'var(--status-modified, #e2b93d)',
  added: 'var(--status-added, #73c991)',
  deleted: 'var(--status-deleted, #f14c4c)',
  renamed: 'var(--status-renamed, #dbb6f2)',
}

export default function CommitDiffView({ files, commitHash }: CommitDiffViewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedFile = files[selectedIndex]

  return (
    <div className="commit-diff-view">
      <div className="commit-diff-view__sidebar">
        <div className="commit-diff-view__header">
          <span className="commit-diff-view__hash">{commitHash.substring(0, 7)}</span>
          <span className="commit-diff-view__count">{files.length} files</span>
        </div>
        <div className="commit-diff-view__file-list">
          {files.map((file, index) => (
            <button
              key={file.path}
              className={`commit-diff-view__file ${index === selectedIndex ? 'commit-diff-view__file--active' : ''}`}
              onClick={() => setSelectedIndex(index)}
            >
              <FileText size={14} />
              <span
                className="commit-diff-view__file-status"
                style={{ color: STATUS_COLORS[file.status] || 'var(--text-secondary)' }}
              >
                {file.status[0].toUpperCase()}
              </span>
              <span className="commit-diff-view__file-name" title={file.path}>
                {file.path.split('/').pop()}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="commit-diff-view__editor">
        {selectedFile && (
          <FileDiffView
            original={selectedFile.original}
            modified={selectedFile.modified}
            fileName={selectedFile.path}
          />
        )}
      </div>
    </div>
  )
}
