import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useBugStore } from '../../stores/useBugStore'
import FixCard from './FixCard'

interface FixListProps {
  repoPath: string
}

export default function FixList({ repoPath }: FixListProps) {
  const { selectedBug, applyFix, applyingFixId } = useBugStore()
  const addFix = useBugStore((s) => s.addFix)
  const [showManual, setShowManual] = useState(false)
  const [manualSummary, setManualSummary] = useState('')

  const bug = selectedBug()
  if (!bug) {
    return <div className="fix-list__empty">Select a bug to see fixes</div>
  }

  const handleManualAdd = async () => {
    if (!manualSummary.trim()) return
    await addFix(repoPath, bug.id, {
      summary: manualSummary.trim(),
      detail: manualSummary.trim(),
      status: 'suggested',
      suggestedBy: 'user'
    })
    setManualSummary('')
    setShowManual(false)
  }

  return (
    <div className="fix-list">
      <div className="fix-list__header">
        <h4>Fix Suggestions</h4>
        <button className="fix-list__add-btn" onClick={() => setShowManual(true)} title="Add manual fix">
          <Plus size={14} />
        </button>
      </div>

      {showManual && (
        <div className="fix-list__manual">
          <input
            className="fix-list__manual-input"
            placeholder="Describe the fix approach..."
            value={manualSummary}
            onChange={(e) => setManualSummary(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleManualAdd(); if (e.key === 'Escape') setShowManual(false) }}
            autoFocus
          />
        </div>
      )}

      <div className="fix-list__items">
        {bug.fixes.map((fix) => (
          <FixCard
            key={fix.id}
            fix={fix}
            onApply={() => applyFix(repoPath, bug.id, fix.id)}
            isApplying={applyingFixId === fix.id}
          />
        ))}
        {bug.fixes.length === 0 && (
          <div className="fix-list__empty-fixes">
            No fixes yet. Ask Claude or add one manually.
          </div>
        )}
      </div>
    </div>
  )
}
