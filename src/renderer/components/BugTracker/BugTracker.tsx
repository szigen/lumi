import { useEffect } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import { useBugStore } from '../../stores/useBugStore'
import BugList from './BugList'
import FixList from './FixList'
import ClaudeInput from './ClaudeInput'
import FixTerminal from './FixTerminal'

export default function BugTracker() {
  const activeTab = useAppStore((s) => s.activeTab)
  const getRepoByName = useRepoStore((s) => s.getRepoByName)
  const { loadBugs, subscribeToStream } = useBugStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null

  useEffect(() => {
    if (activeRepo?.path) {
      loadBugs(activeRepo.path)
    }
  }, [activeRepo?.path, loadBugs])

  useEffect(() => {
    return subscribeToStream()
  }, [subscribeToStream])

  if (!activeRepo) {
    return (
      <div className="bug-tracker bug-tracker--empty">
        <p>Select a repository to view bugs</p>
      </div>
    )
  }

  return (
    <div className="bug-tracker">
      <div className="bug-tracker__left">
        <BugList repoPath={activeRepo.path} />
        <FixList repoPath={activeRepo.path} />
        <ClaudeInput repoPath={activeRepo.path} />
      </div>
      <div className="bug-tracker__right">
        <FixTerminal repoPath={activeRepo.path} />
      </div>
    </div>
  )
}
