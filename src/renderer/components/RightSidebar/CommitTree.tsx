import { useEffect, useState, useMemo } from 'react'
import { GitCommitHorizontal, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import { IconButton, EmptyState } from '../ui'
import BranchSection from './BranchSection'

export default function CommitTree() {
  const [expandedByRepo, setExpandedByRepo] = useState<Map<string, Set<string>>>(new Map())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { activeTab } = useAppStore()
  const { getRepoByName, branches, commits, loadBranches, loadCommits } = useRepoStore()

  const activeRepo = useMemo(
    () => (activeTab ? getRepoByName(activeTab) : null),
    [activeTab, getRepoByName]
  )

  const repoBranches = useMemo(
    () => (activeRepo ? branches.get(activeRepo.path) || [] : []),
    [activeRepo, branches]
  )
  const repoCommits = activeRepo ? commits.get(activeRepo.path) || [] : []

  useEffect(() => {
    if (activeRepo) {
      loadBranches(activeRepo.path)
      loadCommits(activeRepo.path)
    }
  }, [activeRepo, loadBranches, loadCommits])

  const expandedBranches = useMemo(() => {
    if (!activeRepo) return new Set<string>()
    const userExpanded = expandedByRepo.get(activeRepo.path)
    if (userExpanded !== undefined) return userExpanded
    const currentBranch = repoBranches.find((b) => b.isCurrent)
    return currentBranch ? new Set([currentBranch.name]) : new Set<string>()
  }, [activeRepo, expandedByRepo, repoBranches])

  const toggleBranch = (branchName: string) => {
    if (!activeRepo) return
    setExpandedByRepo((prev) => {
      const current = prev.get(activeRepo.path) ?? expandedBranches
      const next = new Set(current)
      if (next.has(branchName)) {
        next.delete(branchName)
      } else {
        next.add(branchName)
      }
      return new Map(prev).set(activeRepo.path, next)
    })
  }

  const handleRefresh = async () => {
    if (activeRepo) {
      setIsRefreshing(true)
      await Promise.all([
        loadBranches(activeRepo.path),
        loadCommits(activeRepo.path)
      ])
      setIsRefreshing(false)
    }
  }

  if (!activeRepo) {
    return (
      <div>
        <EmptyState
          icon={<GitCommitHorizontal />}
          title="No repository"
          description="Select a repository to view commits"
        />
      </div>
    )
  }

  return (
    <div>
      <div>
        <GitCommitHorizontal size={16} />
        <h3>Commits</h3>
        <IconButton
          icon={<RefreshCw />}
          onClick={handleRefresh}
          tooltip="Refresh"
        />
        {isRefreshing && <span>Refreshing...</span>}
      </div>

      <div>
        {repoBranches.length === 0 ? (
          <p>Loading branches...</p>
        ) : (
          <div>
            {repoBranches.map((branch) => (
              <BranchSection
                key={branch.name}
                branch={branch}
                commits={repoCommits}
                isExpanded={expandedBranches.has(branch.name)}
                onToggle={() => toggleBranch(branch.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
