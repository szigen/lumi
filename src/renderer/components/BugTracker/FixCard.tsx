import { Play, CheckCircle, XCircle, Clock, User, Bot } from 'lucide-react'
import type { Fix } from '../../../shared/bug-types'

interface FixCardProps {
  fix: Fix
  onApply: () => void
  isApplying: boolean
}

const STATUS_CONFIG = {
  suggested: { icon: Clock, label: 'Suggested', className: 'fix-card--suggested' },
  applying: { icon: Play, label: 'Applying...', className: 'fix-card--applying' },
  failed: { icon: XCircle, label: 'Failed', className: 'fix-card--failed' },
  success: { icon: CheckCircle, label: 'Success', className: 'fix-card--success' },
}

export default function FixCard({ fix, onApply, isApplying }: FixCardProps) {
  const config = STATUS_CONFIG[fix.status]
  const StatusIcon = config.icon

  return (
    <div className={`fix-card ${config.className}`} aria-busy={fix.status === 'applying'}>
      <div className="fix-card__header">
        <div className="fix-card__source">
          {fix.suggestedBy === 'claude' ? <Bot size={12} /> : <User size={12} />}
          <span>{fix.suggestedBy === 'claude' ? 'Claude' : 'Manual'}</span>
        </div>
        <div className="fix-card__status">
          <StatusIcon size={12} />
          <span>{config.label}</span>
        </div>
      </div>
      <p className="fix-card__summary">{fix.summary}</p>
      {fix.detail && fix.detail !== fix.summary && (
        <p className="fix-card__detail">{fix.detail}</p>
      )}
      {fix.failedNote && (
        <p className="fix-card__failed-note">Note: {fix.failedNote}</p>
      )}
      {fix.status === 'suggested' && (
        <button
          className="fix-card__apply-btn"
          onClick={onApply}
          disabled={isApplying}
        >
          <Play size={12} /> Apply Fix
        </button>
      )}
    </div>
  )
}
