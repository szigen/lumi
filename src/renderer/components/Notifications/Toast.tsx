import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, X, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import type { NotificationToast, ToastType } from '../../stores/useNotificationStore'

interface ToastProps {
  toast: NotificationToast
  onClose: () => void
  onClick?: () => void
}

const AUTO_DISMISS_MS = 5000

const ICON_MAP: Record<ToastType, React.ReactNode> = {
  bell: <Bell size={16} />,
  error: <AlertCircle size={16} />,
  success: <CheckCircle2 size={16} />,
  info: <Info size={16} />
}

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
      className={`toast toast--${toast.type}`}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      layout
    >
      <div className="toast__icon">
        {ICON_MAP[toast.type]}
      </div>
      <div className="toast__body">
        <span className="toast__repo">{toast.title}</span>
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
