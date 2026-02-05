import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import type { NotificationToast } from '../../stores/useNotificationStore'

interface ToastProps {
  toast: NotificationToast
  onClose: () => void
  onClick: () => void
}

const AUTO_DISMISS_MS = 5000

export default function Toast({ toast, onClose, onClick }: ToastProps) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100)
      setProgress(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 50)

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      className="toast"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClick}
      layout
    >
      <div className="toast__icon">
        <Bell size={16} />
      </div>
      <div className="toast__body">
        <span className="toast__repo">{toast.repoName}</span>
        <span className="toast__message">{toast.message}</span>
      </div>
      <button
        className="toast__close"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <X size={14} />
      </button>
      <div className="toast__progress" style={{ width: `${progress}%` }} />
    </motion.div>
  )
}
