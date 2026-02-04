import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, FolderGit2, Folder, Search } from 'lucide-react'
import { useRepoStore } from '../../stores/useRepoStore'
import { useAppStore } from '../../stores/useAppStore'
import { IconButton } from '../ui'

export default function RepoSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { repos, loadRepos } = useRepoStore()
  const { openTabs, openTab } = useAppStore()

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

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const availableRepos = repos
    .filter((r) => !openTabs.includes(r.name))
    .filter((r) => r.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const dropdown = isOpen && (
    <div ref={dropdownRef}>
      <div>
        <Search size={16} />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search repos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {availableRepos.length === 0 ? (
        <div>
          {searchTerm ? 'No matching repos' : 'No more repos available'}
        </div>
      ) : (
        <div>
          {availableRepos.map((repo) => (
            <button
              key={repo.path}
              onClick={() => {
                openTab(repo.name)
                setIsOpen(false)
                setSearchTerm('')
              }}
            >
              {repo.isGitRepo ? <FolderGit2 size={16} /> : <Folder size={16} />}
              <span>{repo.name}</span>
              {repo.isGitRepo && <span>git</span>}
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
        onClick={() => setIsOpen(!isOpen)}
        tooltip="Open repository"
      />
      {createPortal(dropdown, document.body)}
    </>
  )
}
