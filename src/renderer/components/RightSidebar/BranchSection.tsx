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
    <div>
      <button onClick={onToggle}>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <GitBranch size={16} />
        <span>{branch.name}</span>
        {branch.isCurrent && <Badge variant="accent">current</Badge>}
      </button>

      {isExpanded && (
        <div>
          {commits.map((commit, index) => {
            const isHead = index === 0 && branch.isCurrent

            return (
              <div key={commit.hash}>
                <span>{commit.shortHash}</span>
                {isHead && <Badge variant="success">HEAD</Badge>}
                <p>{commit.message}</p>
                <span>{formatDate(commit.date)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
