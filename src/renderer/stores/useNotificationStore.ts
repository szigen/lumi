import { create } from 'zustand'

export type ToastType = 'bell' | 'error' | 'success' | 'info'

export interface NotificationToast {
  id: string
  type: ToastType
  title: string
  message: string
  terminalId?: string
  timestamp: number
}

const MAX_TOASTS = 5
const AUTO_DISMISS_MS = 5000

interface NotificationState {
  toasts: NotificationToast[]
  addToast: (terminalId: string, repoName: string) => void
  notify: (type: ToastType, title: string, message: string) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

let toastCounter = 0

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],

  addToast: (terminalId, repoName) => {
    // Deduplicate: skip if there's already an active toast for this terminal
    if (get().toasts.some((t) => t.type === 'bell' && t.terminalId === terminalId)) return

    const id = `toast-${++toastCounter}`
    const toast: NotificationToast = {
      id,
      type: 'bell',
      title: repoName,
      message: 'Claude is waiting for input',
      terminalId,
      timestamp: Date.now()
    }

    set((state) => {
      const newToasts = [...state.toasts, toast]
      if (newToasts.length > MAX_TOASTS) {
        return { toasts: newToasts.slice(-MAX_TOASTS) }
      }
      return { toasts: newToasts }
    })

    setTimeout(() => {
      get().removeToast(id)
    }, AUTO_DISMISS_MS)
  },

  notify: (type, title, message) => {
    const id = `toast-${++toastCounter}`
    const toast: NotificationToast = {
      id,
      type,
      title,
      message,
      timestamp: Date.now()
    }

    set((state) => {
      const newToasts = [...state.toasts, toast]
      if (newToasts.length > MAX_TOASTS) {
        return { toasts: newToasts.slice(-MAX_TOASTS) }
      }
      return { toasts: newToasts }
    })

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
