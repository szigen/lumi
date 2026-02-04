import { ChevronDown, ChevronRight, GitBranch } from 'lucide-react'
import type { Commit, Branch } from '../../../shared/types'
import { Badge } from '../ui'

interface BranchSectionProps {
  branch: Branch
  commits: Commit[]
  isExpanded: boolean
  onToggle: () => void
}

export default function BranchSection({ branch, commits, isExpanded, onToggle }: BranchSectionProps) {
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
              >
                <span className="commit-hash">{commit.shortHash}</span>
                {isHead && <Badge variant="success">HEAD</Badge>}
                <p className="commit-message">{commit.message}</p>
                <span className="commit-date">{formatDate(commit.date)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
