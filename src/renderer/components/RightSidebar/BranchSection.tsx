import { ChevronDown, ChevronRight, GitBranch } from 'lucide-react'
import type { Commit, Branch, CommitDiffFile } from '../../../shared/types'
import { useAppStore } from '../../stores/useAppStore'
import { Badge } from '../ui'

interface BranchSectionProps {
  branch: Branch
  commits: Commit[]
  isExpanded: boolean
  onToggle: () => void
  repoPath: string
}

export default function BranchSection({ branch, commits, isExpanded, onToggle, repoPath }: BranchSectionProps) {
  const openFileViewer = useAppStore((s) => s.openFileViewer)

  const handleCommitClick = async (commit: Commit) => {
    try {
      const files = await window.api.getCommitDiff(repoPath, commit.hash)
      openFileViewer({
        isOpen: true,
        mode: 'commit-diff',
        commitHash: commit.hash,
        commitFiles: files as CommitDiffFile[],
        repoPath,
      })
    } catch (error) {
      console.error('Failed to get commit diff:', error)
    }
  }
  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className="branch-section">
      <button 
        className={`branch-header ${branch.isCurrent ? 'branch-header--current' : ''}`}
        onClick={onToggle}
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <GitBranch size={14} />
        <span className="branch-header__name">{branch.name}</span>
        {branch.isCurrent && <Badge variant="accent">current</Badge>}
      </button>

      {isExpanded && (
        <div className="commit-list">
          {commits.map((commit, index) => {
            const isHead = index === 0 && branch.isCurrent

            return (
              <div
                key={commit.hash}
                className={`commit-item ${isHead ? 'commit-item--head' : ''}`}
                onClick={() => handleCommitClick(commit)}
                style={{ cursor: 'pointer' }}
              >
                <span className="commit-hash">{commit.shortHash}</span>
                {isHead && <Badge variant="success">HEAD</Badge>}
                <p className="commit-message"><span>{commit.message}</span></p>
                <span className="commit-date">{formatDate(commit.date)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
