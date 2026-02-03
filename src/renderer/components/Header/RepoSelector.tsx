import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, FolderGit2, Folder } from 'lucide-react'
import { useRepoStore } from '../../stores/useRepoStore'
import { useAppStore } from '../../stores/useAppStore'
import { IconButton } from '../ui'

export default function RepoSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const { repos, loadRepos } = useRepoStore()
  const { openTabs, openTab } = useAppStore()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadRepos()
  }, [loadRepos])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const availableRepos = repos.filter((r) => !openTabs.includes(r.name))

  return (
    <div className="relative" ref={dropdownRef}>
      <IconButton
        icon={<Plus />}
        onClick={() => setIsOpen(!isOpen)}
        tooltip="Open repository"
        variant="ghost"
        size="sm"
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="
              absolute top-full left-0 mt-2
              w-56 py-1
              bg-bg-elevated/95 backdrop-blur-glass
              border border-border-default
              rounded-xl shadow-dropdown
              z-50 overflow-hidden
            "
          >
            {availableRepos.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-text-secondary text-sm">No more repos available</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {availableRepos.map((repo, index) => (
                  <motion.button
                    key={repo.path}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: index * 0.03 }}
                    onClick={() => {
                      openTab(repo.name)
                      setIsOpen(false)
                    }}
                    className="
                      w-full flex items-center gap-3 px-3 py-2
                      text-left text-sm text-text-primary
                      hover:bg-surface-hover
                      transition-colors duration-fast
                    "
                  >
                    {repo.isGitRepo ? (
                      <FolderGit2 className="w-4 h-4 text-accent flex-shrink-0" />
                    ) : (
                      <Folder className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                    )}
                    <span className="truncate">{repo.name}</span>
                    {repo.isGitRepo && (
                      <span className="
                        ml-auto px-1.5 py-0.5
                        text-2xs text-accent
                        bg-accent/10 rounded
                      ">
                        git
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
