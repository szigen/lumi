type StatusType = 'idle' | 'working' | 'waiting-unseen' | 'waiting-focused' | 'waiting-seen' | 'error'

interface StatusDotProps {
  status: StatusType
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
