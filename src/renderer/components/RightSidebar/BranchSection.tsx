import type { Commit, Branch } from '../../../shared/types'

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
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="w-full text-left px-2 py-1 flex items-center gap-2 text-sm hover:bg-bg-tertiary rounded"
      >
        <span className="text-text-secondary">{isExpanded ? '▼' : '▶'}</span>
        <span className={branch.isCurrent ? 'text-accent font-medium' : 'text-text-primary'}>
          {branch.name}
        </span>
        {branch.isCurrent && (
          <span className="text-xs text-accent">(current)</span>
        )}
      </button>

      {isExpanded && (
        <div className="ml-4 border-l border-border-primary">
          {commits.map((commit, index) => (
            <div
              key={commit.hash}
              className="relative pl-4 py-1.5 hover:bg-bg-tertiary cursor-pointer group"
            >
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${
                index === 0 && branch.isCurrent ? 'bg-accent' : 'bg-border-primary'
              }`} />
              <div className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-accent font-mono">{commit.shortHash}</span>
                  {index === 0 && branch.isCurrent && (
                    <span className="text-text-secondary">(HEAD)</span>
                  )}
                </div>
                <p className="text-text-primary truncate">{commit.message}</p>
                <p className="text-text-secondary">{formatDate(commit.date)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
