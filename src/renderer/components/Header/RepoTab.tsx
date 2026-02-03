import { motion } from 'framer-motion'
import { X, Folder } from 'lucide-react'

interface RepoTabProps {
  name: string
  isActive: boolean
  onClick: () => void
  onClose: () => void
}

export default function RepoTab({ name, isActive, onClick, onClose }: RepoTabProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative group flex items-center gap-2 px-3 py-1.5
        rounded-lg cursor-pointer
        transition-all duration-fast ease-out
        ${isActive
          ? 'bg-bg-tertiary text-text-primary border border-border-default shadow-glow-accent'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent'
        }
      `}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute inset-0 rounded-lg bg-accent/5 border border-accent/30"
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      <Folder className="w-3.5 h-3.5 relative z-10 flex-shrink-0 text-accent" />

      <span className="text-sm truncate max-w-28 relative z-10">
        {name}
      </span>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className={`
          relative z-10 p-0.5 rounded
          transition-all duration-fast
          ${isActive
            ? 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            : 'opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-text-primary hover:bg-surface-hover'
          }
        `}
      >
        <X className="w-3 h-3" />
      </motion.button>
    </motion.div>
  )
}
