import { useState } from 'react'
import { Bug as BugIcon, Plus, CheckCircle, Circle } from 'lucide-react'
import { useBugStore } from '../../stores/useBugStore'
import type { BugFilter } from '../../../shared/bug-types'
import BugForm from './BugForm'

interface BugListProps {
  repoPath: string
}

const FILTER_OPTIONS: { value: BugFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
]

export default function BugList({ repoPath }: BugListProps) {
  const { filteredBugs, selectedBugId, selectBug, createBug, filter, setFilter } = useBugStore()
  const [showForm, setShowForm] = useState(false)

  const bugs = filteredBugs()

  const handleCreate = async (title: string, description: string) => {
    await createBug(repoPath, title, description)
    setShowForm(false)
  }

  return (
    <div className="bug-list">
      <div className="bug-list__header">
        <div className="bug-list__title">
          <BugIcon size={16} />
          <h3>Known Bugs</h3>
          <span className="bug-list__count">{bugs.length}</span>
        </div>
        <button
          className="bug-list__add-btn"
          onClick={() => setShowForm(true)}
          title="Add new bug"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="bug-list__filters">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`bug-list__filter ${filter === opt.value ? 'bug-list__filter--active' : ''}`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {showForm && <BugForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      <div className="bug-list__items">
        {bugs.map((bug) => (
          <button
            key={bug.id}
            className={`bug-card ${selectedBugId === bug.id ? 'bug-card--selected' : ''}`}
            onClick={() => selectBug(bug.id)}
          >
            {bug.status === 'resolved' ? (
              <CheckCircle size={14} className="bug-card__icon bug-card__icon--resolved" />
            ) : (
              <Circle size={14} className="bug-card__icon bug-card__icon--open" />
            )}
            <div className="bug-card__content">
              <span className="bug-card__title">{bug.title}</span>
              <span className="bug-card__meta">
                {bug.fixes.length} fix{bug.fixes.length !== 1 ? 'es' : ''}
                {bug.fixes.filter(f => f.status === 'failed').length > 0 &&
                  ` · ${bug.fixes.filter(f => f.status === 'failed').length} failed`}
              </span>
            </div>
          </button>
        ))}
        {bugs.length === 0 && !showForm && (
          <div className="bug-list__empty">No bugs found</div>
        )}
      </div>
    </div>
  )
}
