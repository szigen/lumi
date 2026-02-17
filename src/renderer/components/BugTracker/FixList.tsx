import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useBugStore, selectSelectedBug } from '../../stores/useBugStore'
import { useAppStore } from '../../stores/useAppStore'
import { getProviderLabel } from '../../../shared/ai-provider'
import FixCard from './FixCard'

interface FixListProps {
  repoPath: string
}

export default function FixList({ repoPath }: FixListProps) {
  const aiProvider = useAppStore((s) => s.aiProvider)
  const bug = useBugStore(selectSelectedBug)
  const applyFix = useBugStore((s) => s.applyFix)
  const applyingFixId = useBugStore((s) => s.applyingFixId)
  const addFix = useBugStore((s) => s.addFix)
  const [showManual, setShowManual] = useState(false)
  const [manualSummary, setManualSummary] = useState('')
  const providerLabel = getProviderLabel(aiProvider)

  if (!bug) {
    return <div className="fix-list__empty">Select a bug to see fixes</div>
  }

  const handleManualAdd = async () => {
    if (!manualSummary.trim()) return
    try {
      await addFix(repoPath, bug.id, {
        summary: manualSummary.trim(),
        detail: manualSummary.trim(),
        status: 'suggested',
        suggestedBy: 'user'
      })
      setManualSummary('')
      setShowManual(false)
    } catch (err) {
      console.error('Failed to add fix:', err)
    }
  }

  const handleApply = async (fixId: string) => {
    try {
      await applyFix(repoPath, bug.id, fixId)
    } catch (err) {
      console.error('Failed to apply fix:', err)
    }
  }

  return (
    <div className="fix-list">
      <div className="fix-list__header">
        <h4>Fix Suggestions</h4>
        <button className="fix-list__add-btn" onClick={() => setShowManual(true)} title="Add manual fix" aria-label="Add manual fix">
          <Plus size={14} />
        </button>
      </div>

      {showManual && (
        <div className="fix-list__manual">
          <label htmlFor="fix-manual-input" className="visually-hidden">Describe the fix approach</label>
          <input
            id="fix-manual-input"
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
            onApply={() => handleApply(fix.id)}
            isApplying={applyingFixId === fix.id}
          />
        ))}
        {bug.fixes.length === 0 && (
          <div className="fix-list__empty-fixes">
            No fixes yet. Ask {providerLabel} or add one manually.
          </div>
        )}
      </div>
    </div>
  )
}
