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
  const sourceLabel = fix.suggestedBy === 'codex'
    ? 'Codex'
    : fix.suggestedBy === 'claude'
      ? 'Claude'
      : 'Manual'

  return (
    <div className={`fix-card ${config.className}`} aria-busy={fix.status === 'applying'}>
      <div className="fix-card__header">
        <div className="fix-card__source">
          {fix.suggestedBy === 'user' ? <User size={12} /> : <Bot size={12} />}
          <span>{sourceLabel}</span>
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
