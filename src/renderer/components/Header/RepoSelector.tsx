import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, FolderGit2, Folder, Search } from 'lucide-react'
import { useRepoStore } from '../../stores/useRepoStore'
import { useAppStore } from '../../stores/useAppStore'
import { IconButton } from '../ui'

export default function RepoSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { repos, loadRepos } = useRepoStore()
  const { openTabs, openTab } = useAppStore()

  const availableRepos = useMemo(() =>
    repos
      .filter((r) => !openTabs.includes(r.name))
      .filter((r) => r.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [repos, openTabs, searchTerm]
  )

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
          setSelectedIndex(i => Math.min(i + 1, availableRepos.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(i => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (availableRepos[selectedIndex]) {
            openTab(availableRepos[selectedIndex].name)
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
  }, [isOpen, availableRepos, selectedIndex, openTab])

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
          {availableRepos.map((repo, index) => (
            <button
              key={repo.path}
              className={`repo-dropdown__item ${index === selectedIndex ? 'repo-dropdown__item--selected' : ''}`}
              onClick={() => {
                openTab(repo.name)
                setIsOpen(false)
                setSearchTerm('')
                setSelectedIndex(0)
              }}
            >
              {repo.isGitRepo ? <FolderGit2 size={16} /> : <Folder size={16} />}
              <span className="repo-dropdown__item-name">{repo.name}</span>
              {repo.isGitRepo && <span className="repo-dropdown__item-badge">git</span>}
            </button>
          ))}
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
