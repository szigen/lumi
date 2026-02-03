import { useEffect, useState } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import BranchSection from './BranchSection'

export default function CommitTree() {
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
  const { activeTab } = useAppStore()
  const { getRepoByName, branches, commits, loadBranches, loadCommits } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null
  const repoBranches = activeRepo ? branches.get(activeRepo.path) || [] : []
  const repoCommits = activeRepo ? commits.get(activeRepo.path) || [] : []

  useEffect(() => {
    if (activeRepo) {
      loadBranches(activeRepo.path)
      loadCommits(activeRepo.path)
    }
  }, [activeRepo?.path, loadBranches, loadCommits])

  useEffect(() => {
    // Auto-expand current branch
    const currentBranch = repoBranches.find(b => b.isCurrent)
    if (currentBranch) {
      setExpandedBranches(new Set([currentBranch.name]))
    }
  }, [repoBranches])

  const toggleBranch = (branchName: string) => {
    setExpandedBranches(prev => {
      const next = new Set(prev)
      if (next.has(branchName)) {
        next.delete(branchName)
      } else {
        next.add(branchName)
      }
      return next
    })
  }

  const handleRefresh = () => {
    if (activeRepo) {
      loadBranches(activeRepo.path)
      loadCommits(activeRepo.path)
    }
  }

  if (!activeRepo) {
    return (
      <div className="p-4 text-text-secondary text-sm">
        Select a repository to view commits
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-border-primary">
        <h3 className="text-sm font-medium text-text-primary">Commits</h3>
        <button
          onClick={handleRefresh}
          className="p-1 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {repoBranches.length === 0 ? (
          <p className="text-text-secondary text-sm">Loading...</p>
        ) : (
          repoBranches.map((branch) => (
            <BranchSection
              key={branch.name}
              branch={branch}
              commits={repoCommits}
              isExpanded={expandedBranches.has(branch.name)}
              onToggle={() => toggleBranch(branch.name)}
            />
          ))
        )}
      </div>
    </div>
  )
}
