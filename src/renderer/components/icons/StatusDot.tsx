type StatusType = 'running' | 'completed' | 'error' | 'idle' | 'warning'

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
