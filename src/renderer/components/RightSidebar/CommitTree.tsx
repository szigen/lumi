import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import BranchSection from './BranchSection'

export default function CommitTree() {
  const [expandedByRepo, setExpandedByRepo] = useState<Map<string, Set<string>>>(new Map())
  const { activeTab } = useAppStore()
  const { getRepoByName, branches, loadBranches, loadAllBranchCommits, getCommitsForBranch } = useRepoStore()

  const activeRepo = useMemo(
    () => (activeTab ? getRepoByName(activeTab) : null),
    [activeTab, getRepoByName]
  )

  const repoBranches = useMemo(
    () => (activeRepo ? branches.get(activeRepo.path) || [] : []),
    [activeRepo, branches]
  )

  // Branch'leri yükle
  useEffect(() => {
    if (activeRepo) {
      loadBranches(activeRepo.path)
    }
  }, [activeRepo, loadBranches])

  // Branch'ler yüklendikten sonra commits'leri yükle
  useEffect(() => {
    if (activeRepo && repoBranches.length > 0) {
      loadAllBranchCommits(activeRepo.path)
    }
  }, [activeRepo, repoBranches, loadAllBranchCommits])

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

  if (!activeRepo) {
    return null
  }

  return (
    <div className="commit-tree">
      <div className="commit-list-container">
        {repoBranches.length === 0 ? (
          <p className="tree-empty">Loading branches...</p>
        ) : (
          <div>
            {repoBranches.map((branch) => (
              <BranchSection
                key={branch.name}
                branch={branch}
                commits={getCommitsForBranch(activeRepo.path, branch.name)}
                isExpanded={expandedBranches.has(branch.name)}
                onToggle={() => toggleBranch(branch.name)}
                repoPath={activeRepo.path}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
