import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GitCommitHorizontal, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import { IconButton, EmptyState } from '../ui'
import BranchSection from './BranchSection'

export default function CommitTree() {
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)
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
      <div className="h-full flex items-center justify-center p-4">
        <EmptyState
          icon={<GitCommitHorizontal />}
          title="No repository"
          description="Select a repository to view commits"
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="
        flex items-center justify-between
        p-3 border-b border-border-subtle
      ">
        <div className="flex items-center gap-2">
          <GitCommitHorizontal className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-medium text-text-primary">Commits</h3>
        </div>
        <IconButton
          icon={
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
            >
              <RefreshCw />
            </motion.div>
          }
          onClick={handleRefresh}
          tooltip="Refresh"
          variant="ghost"
          size="sm"
        />
      </div>

      {/* Branch List */}
      <div className="flex-1 overflow-y-auto p-3">
        {repoBranches.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-6 animate-shimmer rounded w-24" />
                <div className="ml-4 space-y-2">
                  <div className="h-12 animate-shimmer rounded" />
                  <div className="h-12 animate-shimmer rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {repoBranches.map((branch, index) => (
              <motion.div
                key={branch.name}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <BranchSection
                  branch={branch}
                  commits={repoCommits}
                  isExpanded={expandedBranches.has(branch.name)}
                  onToggle={() => toggleBranch(branch.name)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
