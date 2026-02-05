import { useEffect, useMemo } from 'react'
import { GitCommitHorizontal, FileText } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import { EmptyState } from '../ui'
import CollapsibleSection from './CollapsibleSection'
import CommitTree from './CommitTree'
import ChangesSection from './ChangesSection'

export default function RightSidebar() {
  const { activeTab } = useAppStore()
  const { getRepoByName, changes, loadChanges } = useRepoStore()

  const activeRepo = useMemo(
    () => (activeTab ? getRepoByName(activeTab) : null),
    [activeTab, getRepoByName]
  )

  useEffect(() => {
    if (activeRepo) {
      loadChanges(activeRepo.path)
    }
  }, [activeRepo, loadChanges])

  const changeCount = useMemo(
    () => (activeRepo ? (changes.get(activeRepo.path) || []).length : 0),
    [activeRepo, changes]
  )

  if (!activeRepo) {
    return (
      <div className="right-sidebar">
        <EmptyState
          icon={<GitCommitHorizontal size={32} />}
          title="No repository"
          description="Select a repository to view"
        />
      </div>
    )
  }

  return (
    <div className="right-sidebar">
      <CollapsibleSection
        title="Commits"
        icon={<GitCommitHorizontal size={14} />}
        defaultOpen
      >
        <CommitTree />
      </CollapsibleSection>

      <CollapsibleSection
        title="Changes"
        icon={<FileText size={14} />}
        badge={changeCount}
        defaultOpen
      >
        <ChangesSection />
      </CollapsibleSection>
    </div>
  )
}
