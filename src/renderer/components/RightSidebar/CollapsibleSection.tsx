import { useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '../ui'

interface CollapsibleSectionProps {
  title: string
  icon: ReactNode
  badge?: number
  defaultOpen?: boolean
  children: ReactNode
}

export default function CollapsibleSection({
  title,
  icon,
  badge,
  defaultOpen = false,
  children
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="collapsible-section">
      <button
        className="collapsible-section__header"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="collapsible-section__icon">{icon}</span>
        <h3 className="collapsible-section__title">{title}</h3>
        {badge !== undefined && badge > 0 && (
          <Badge variant="warning">{badge}</Badge>
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="collapsible-section__content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
