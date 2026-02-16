import type { TerminalStatus } from '../../../shared/types'

interface StatusDotProps {
  status: TerminalStatus
  className?: string
}

export default function StatusDot({ status, className = '' }: StatusDotProps) {
  return (
    <span
      className={`status-dot status-dot--${status} ${className}`}
      aria-label={status}
    />
  )
}
