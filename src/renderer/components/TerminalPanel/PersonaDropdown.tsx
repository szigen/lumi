import { useState, useEffect, useRef } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui'
import type { Persona } from '../../../shared/persona-types'

interface PersonaDropdownProps {
  disabled?: boolean
  onNewClaude: () => void
  onPersonaSelect: (persona: Persona) => void
  repoPath?: string
  onOpenChange?: (open: boolean) => void
}

export default function PersonaDropdown({
  disabled,
  onNewClaude,
  onPersonaSelect,
  repoPath,
  onOpenChange
}: PersonaDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [personas, setPersonas] = useState<Persona[]>([])
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const list = await window.api.getPersonas(repoPath)
        setPersonas(list as Persona[])
      } catch (error) {
        console.error('Failed to load personas:', error)
        setPersonas([])
      }
    }

    loadPersonas()
    const cleanup = window.api.onPersonasChanged(loadPersonas)
    return cleanup
  }, [repoPath])

  useEffect(() => {
    if (repoPath) {
      window.api.loadProjectPersonas(repoPath)
    }
  }, [repoPath])

  useEffect(() => {
    onOpenChange?.(isOpen)
  }, [isOpen, onOpenChange])

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }

  const handlePersonaClick = (persona: Persona) => {
    setIsOpen(false)
    onPersonaSelect(persona)
  }

  return (
    <div
      className="persona-dropdown-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button
        leftIcon={<Plus size={14} />}
        rightIcon={<ChevronDown size={12} />}
        onClick={onNewClaude}
        disabled={disabled}
      >
        New Claude
      </Button>

      <AnimatePresence>
        {isOpen && personas.length > 0 && !disabled && (
          <motion.div
            className="persona-dropdown"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {personas.map((persona) => (
              <button
                key={persona.id}
                className="persona-dropdown__item"
                onClick={() => handlePersonaClick(persona)}
              >
                New {persona.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
