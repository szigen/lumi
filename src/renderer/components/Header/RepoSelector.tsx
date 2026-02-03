import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, FolderGit2, Folder } from 'lucide-react'
import { useRepoStore } from '../../stores/useRepoStore'
import { useAppStore } from '../../stores/useAppStore'
import { IconButton } from '../ui'

export default function RepoSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { repos, loadRepos } = useRepoStore()
  const { openTabs, openTab } = useAppStore()

  useEffect(() => {
    loadRepos()
  }, [loadRepos])

  // Calculate dropdown position
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 8,
        left: rect.left
      })
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return
      setIsOpen(false)
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const availableRepos = repos.filter((r) => !openTabs.includes(r.name))

  const dropdown = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{ top: position.top, left: position.left }}
          className="
            fixed w-56 py-1
            bg-bg-elevated/95 backdrop-blur-glass
            border border-border-default
            rounded-xl shadow-dropdown
            z-[9999]
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
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.12, delay: index * 0.02 }}
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
                    <span className="ml-auto px-1.5 py-0.5 text-2xs text-accent bg-accent/10 rounded-md">
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
  )

  return (
    <>
      <IconButton
        ref={triggerRef}
        icon={<Plus />}
        onClick={() => setIsOpen(!isOpen)}
        tooltip="Open repository"
        variant="ghost"
        size="sm"
      />
      {createPortal(dropdown, document.body)}
    </>
  )
}
