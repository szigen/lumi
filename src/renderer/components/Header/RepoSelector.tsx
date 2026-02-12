import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, FolderGit2, Folder, Search, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRepoStore, groupReposBySource } from '../../stores/useRepoStore'
import { useAppStore } from '../../stores/useAppStore'
import { IconButton } from '../ui'
import type { Repository } from '../../../shared/types'

export default function RepoSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { repos, additionalPaths, loadRepos } = useRepoStore()
  const { openTabs, openTab, collapsedGroups, toggleGroupCollapse } = useAppStore()

  const availableRepos = useMemo(() =>
    repos
      .filter((r) => !openTabs.includes(r.name))
      .filter((r) => r.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [repos, openTabs, searchTerm]
  )

  const groups = useMemo(() =>
    groupReposBySource(availableRepos, additionalPaths),
    [availableRepos, additionalPaths]
  )

  // Flat list for keyboard navigation
  const flatRepos = useMemo(() => {
    const result: typeof availableRepos = []
    for (const group of groups) {
      if (!collapsedGroups.has(group.key)) {
        result.push(...group.repos)
      }
    }
    return result
  }, [groups, collapsedGroups])

  useEffect(() => {
    loadRepos()
  }, [loadRepos])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return
      setIsOpen(false)
      setSearchTerm('')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          setIsOpen(false)
          setSearchTerm('')
          setSelectedIndex(0)
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(i => Math.min(i + 1, flatRepos.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(i => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (flatRepos[selectedIndex]) {
            openTab(flatRepos[selectedIndex].name)
            setIsOpen(false)
            setSearchTerm('')
            setSelectedIndex(0)
          }
          break
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, flatRepos, selectedIndex, openTab])

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Listen for global keyboard shortcut (Cmd+O)
  useEffect(() => {
    const handleOpenEvent = () => {
      setIsOpen(true)
      setSelectedIndex(0)
    }
    window.addEventListener('open-repo-selector', handleOpenEvent)
    return () => window.removeEventListener('open-repo-selector', handleOpenEvent)
  }, [])

  const hasMultipleGroups = groups.length > 1

  const renderRepoItem = (repo: Repository, index: number) => (
    <button
      key={repo.path}
      className={`repo-dropdown__item ${index === selectedIndex ? 'repo-dropdown__item--selected' : ''}`}
      onClick={() => { openTab(repo.name); setIsOpen(false); setSearchTerm(''); setSelectedIndex(0) }}
    >
      {repo.isGitRepo ? <FolderGit2 size={16} /> : <Folder size={16} />}
      <span className="repo-dropdown__item-name">{repo.name}</span>
      {repo.isGitRepo && <span className="repo-dropdown__item-badge">git</span>}
    </button>
  )

  const dropdown = isOpen && (
    <div ref={dropdownRef} className="repo-dropdown">
      <div className="repo-dropdown__search">
        <Search size={16} />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search repos..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setSelectedIndex(0)
          }}
        />
      </div>

      {availableRepos.length === 0 ? (
        <div className="repo-dropdown__empty">
          {searchTerm ? 'No matching repos' : 'No more repos available'}
        </div>
      ) : (
        <div className="repo-dropdown__list">
          {hasMultipleGroups ? (
            groups.map((group) => (
              <div key={group.key} className="repo-group">
                <div
                  className="repo-group__header"
                  onClick={() => toggleGroupCollapse(group.key)}
                >
                  <ChevronDown
                    size={12}
                    className={`repo-group__chevron ${collapsedGroups.has(group.key) ? 'repo-group__chevron--collapsed' : ''}`}
                  />
                  <span className="repo-group__label">{group.label}</span>
                  <span className="repo-group__count">{group.repos.length}</span>
                </div>
                <AnimatePresence initial={false}>
                  {!collapsedGroups.has(group.key) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ overflow: 'hidden' }}
                    >
                      {group.repos.length === 0 ? (
                        <div className="repo-group__empty">No repositories found</div>
                      ) : (
                        group.repos.map((repo) => renderRepoItem(repo, flatRepos.indexOf(repo)))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          ) : (
            availableRepos.map((repo, index) => renderRepoItem(repo, index))
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      <IconButton
        ref={triggerRef}
        icon={<Plus />}
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) setSelectedIndex(0)
        }}
        tooltip="Open repository (⌘O)"
      />
      {createPortal(dropdown, document.body)}
    </>
  )
}
