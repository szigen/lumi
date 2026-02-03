import { motion } from 'framer-motion'

type StatusType = 'running' | 'completed' | 'error' | 'idle' | 'warning'

interface StatusDotProps {
  status: StatusType
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  className?: string
}

const statusColors: Record<StatusType, { bg: string; glow: string }> = {
  running: {
    bg: 'bg-success',
    glow: 'shadow-glow-success',
  },
  completed: {
    bg: 'bg-info',
    glow: 'shadow-glow-info',
  },
  error: {
    bg: 'bg-error',
    glow: 'shadow-glow-error',
  },
  idle: {
    bg: 'bg-text-tertiary',
    glow: '',
  },
  warning: {
    bg: 'bg-warning',
    glow: 'shadow-glow-warning',
  },
}

const sizeClasses: Record<string, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
}

export default function StatusDot({
  status,
  size = 'md',
  animated = true,
  className = '',
}: StatusDotProps) {
  const colors = statusColors[status]
  const shouldAnimate = animated && status === 'running'

  return (
    <span className={`relative flex items-center justify-center ${className}`}>
      {shouldAnimate && (
        <motion.span
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={`
            absolute
            ${sizeClasses[size]}
            rounded-full
            ${colors.bg}
          `}
        />
      )}
      <span
        className={`
          relative
          ${sizeClasses[size]}
          rounded-full
          ${colors.bg}
          ${colors.glow}
        `}
      />
    </span>
  )
}
