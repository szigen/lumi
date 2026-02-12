import { AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '../../stores/useNotificationStore'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import Toast from './Toast'

export default function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore()
  const { terminals, setActiveTerminal } = useTerminalStore()
  const { openTabs, setActiveTab } = useAppStore()

  const handleBellClick = (toastId: string, terminalId: string, title: string) => {
    if (openTabs.includes(title)) {
      setActiveTab(title)
    }

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
            onClick={
              toast.type === 'bell' && toast.terminalId
                ? () => handleBellClick(toast.id, toast.terminalId!, toast.title)
                : undefined
            }
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
