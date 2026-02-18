import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'

export default function QuitDialog() {
  const { quitDialogOpen, quitTerminalCount, hideQuitDialog } = useAppStore()

  const handleQuit = () => {
    window.api.confirmQuit()
  }

  useEffect(() => {
    if (!quitDialogOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideQuitDialog()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [quitDialogOpen, hideQuitDialog])

  return (
    <AnimatePresence>
      {quitDialogOpen && (
        <motion.div
          className="settings-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={hideQuitDialog}
        >
          <motion.div
            className="quit-dialog"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="quit-dialog__icon">
              <AlertTriangle size={32} />
            </div>

            <h2 className="quit-dialog__title">Quit Lumi?</h2>

            <p className="quit-dialog__message">
              You have <strong>{quitTerminalCount} active terminal session{quitTerminalCount !== 1 ? 's' : ''}</strong>.
              All running processes will be terminated.
            </p>

            <div className="quit-dialog__footer">
              <button className="quit-dialog__cancel-btn" onClick={hideQuitDialog}>
                Cancel
              </button>
              <button className="quit-dialog__quit-btn" onClick={handleQuit} autoFocus>
                Quit
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
