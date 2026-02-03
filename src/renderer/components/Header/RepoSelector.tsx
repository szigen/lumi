import { useState, useEffect, useRef } from 'react'
import { useRepoStore } from '../../stores/useRepoStore'
import { useAppStore } from '../../stores/useAppStore'

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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded border border-border-primary text-sm"
      >
        +
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-bg-secondary border border-border-primary rounded shadow-lg z-50">
          {availableRepos.length === 0 ? (
            <div className="px-3 py-2 text-text-secondary text-sm">
              No more repos available
            </div>
          ) : (
            availableRepos.map((repo) => (
              <button
                key={repo.path}
                onClick={() => {
                  openTab(repo.name)
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg-tertiary flex items-center gap-2"
              >
                {repo.isGitRepo && <span className="text-accent">●</span>}
                {repo.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
