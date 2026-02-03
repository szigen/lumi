import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, GitBranch } from 'lucide-react'
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
    <div className="mb-1">
      {/* Branch Header */}
      <button
        onClick={onToggle}
        className="
          w-full flex items-center gap-2.5 px-2 py-2
          rounded-lg
          hover:bg-surface-hover
          transition-colors duration-fast
          group
        "
      >
        <motion.span
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.15 }}
          className="text-text-tertiary"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>

        <GitBranch className={`w-4 h-4 flex-shrink-0 ${branch.isCurrent ? 'text-accent' : 'text-text-tertiary'}`} />

        <span className={`
          text-sm truncate
          ${branch.isCurrent ? 'text-accent font-medium' : 'text-text-primary'}
        `}>
          {branch.name}
        </span>

        {branch.isCurrent && (
          <Badge variant="accent" size="sm">
            current
          </Badge>
        )}
      </button>

      {/* Commits Timeline */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-4 pl-4 border-l border-border-subtle">
              {commits.map((commit, index) => {
                const isHead = index === 0 && branch.isCurrent

                return (
                  <motion.div
                    key={commit.hash}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="
                      relative py-2.5 pl-4
                      hover:bg-surface-hover rounded-r-lg
                      cursor-pointer group
                      transition-colors duration-fast
                    "
                  >
                    {/* Timeline dot */}
                    <span className={`
                      absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2
                      w-2.5 h-2.5 rounded-full
                      border-2 border-bg-secondary
                      ${isHead
                        ? 'bg-accent shadow-glow-accent'
                        : 'bg-bg-tertiary group-hover:bg-text-tertiary'
                      }
                      transition-colors duration-fast
                    `} />

                    <div className="space-y-1">
                      {/* Hash and HEAD indicator */}
                      <div className="flex items-center gap-2">
                        <span className="
                          font-mono text-xs
                          text-accent
                          bg-accent/10 px-1.5 py-0.5 rounded
                        ">
                          {commit.shortHash}
                        </span>
                        {isHead && (
                          <Badge variant="success" size="sm" dot>
                            HEAD
                          </Badge>
                        )}
                      </div>

                      {/* Commit message */}
                      <p className="text-sm text-text-primary truncate pr-2">
                        {commit.message}
                      </p>

                      {/* Date */}
                      <p className="text-xs text-text-tertiary">
                        {formatDate(commit.date)}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
