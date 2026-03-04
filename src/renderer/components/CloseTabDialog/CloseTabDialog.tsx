import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'

export default function CloseTabDialog() {
  const { closeTabDialogOpen, closeTabRepoName, closeTabMinimizedCount, hideCloseTabDialog, confirmCloseTab } = useAppStore()

  useEffect(() => {
    if (!closeTabDialogOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideCloseTabDialog()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [closeTabDialogOpen, hideCloseTabDialog])

  return (
    <AnimatePresence>
      {closeTabDialogOpen && (
        <motion.div
          className="settings-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={hideCloseTabDialog}
        >
          <motion.div
            className="close-tab-dialog"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="close-tab-dialog__icon">
              <AlertTriangle size={32} />
            </div>

            <h2 className="close-tab-dialog__title">Close {closeTabRepoName}?</h2>

            <p className="close-tab-dialog__message">
              You have <strong>{closeTabMinimizedCount} minimized terminal{closeTabMinimizedCount !== 1 ? 's' : ''}</strong> that
              will be terminated.
            </p>

            <div className="close-tab-dialog__footer">
              <button className="close-tab-dialog__cancel-btn" onClick={hideCloseTabDialog}>
                Cancel
              </button>
              <button className="close-tab-dialog__close-btn" onClick={confirmCloseTab} autoFocus>
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
