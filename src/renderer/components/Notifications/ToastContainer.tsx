import { AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '../../stores/useNotificationStore'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import Toast from './Toast'

export default function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore()
  const { terminals, setActiveTerminal } = useTerminalStore()
  const { openTabs, setActiveTab } = useAppStore()

  const handleToastClick = (toastId: string, terminalId: string, repoName: string) => {
    // Switch to the repo tab if not already active
    if (openTabs.includes(repoName)) {
      setActiveTab(repoName)
    }

    // Switch to the terminal
    if (terminals.has(terminalId)) {
      setActiveTerminal(terminalId)
    }

    removeToast(toastId)
  }

  return (
    <div className="toast-container">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
            onClick={() => handleToastClick(toast.id, toast.terminalId, toast.repoName)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
