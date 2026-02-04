type StatusType = 'running' | 'completed' | 'error' | 'idle' | 'warning'

interface StatusDotProps {
  status: StatusType
}

export default function StatusDot({ status }: StatusDotProps) {
  const labels: Record<StatusType, string> = {
    running: '●',
    completed: '✓',
    error: '✗',
    idle: '○',
    warning: '!'
  }

  return <span>{labels[status]}</span>
}
