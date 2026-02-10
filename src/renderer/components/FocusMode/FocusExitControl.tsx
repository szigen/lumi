import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'

const HOVER_ZONE_HEIGHT = 50
const HOVER_DELAY_MS = 500

export default function FocusExitControl() {
  const { toggleFocusMode } = useAppStore()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (e.clientY <= HOVER_ZONE_HEIGHT) {
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          setVisible(true)
        }, HOVER_DELAY_MS)
      }
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setVisible(false)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [handleMouseMove])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="focus-exit-control"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <button
            className="focus-exit-control__btn"
            onClick={toggleFocusMode}
          >
            <X size={14} />
            Exit Focus Mode
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
