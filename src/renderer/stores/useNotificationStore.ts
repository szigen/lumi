import { create } from 'zustand'

export interface NotificationToast {
  id: string
  terminalId: string
  repoName: string
  message: string
  timestamp: number
}

const MAX_TOASTS = 5
const AUTO_DISMISS_MS = 5000

interface NotificationState {
  toasts: NotificationToast[]
  addToast: (terminalId: string, repoName: string) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

let toastCounter = 0

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],

  addToast: (terminalId, repoName) => {
    // Deduplicate: skip if there's already an active toast for this terminal
    if (get().toasts.some((t) => t.terminalId === terminalId)) return

    const id = `toast-${++toastCounter}`
    const toast: NotificationToast = {
      id,
      terminalId,
      repoName,
      message: 'Claude is waiting for input',
      timestamp: Date.now()
    }

    set((state) => {
      const newToasts = [...state.toasts, toast]
      // Keep only the latest MAX_TOASTS
      if (newToasts.length > MAX_TOASTS) {
        return { toasts: newToasts.slice(-MAX_TOASTS) }
      }
      return { toasts: newToasts }
    })

    // Auto-dismiss
    setTimeout(() => {
      get().removeToast(id)
    }, AUTO_DISMISS_MS)
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
  },

  clearAll: () => {
    set({ toasts: [] })
  }
}))
