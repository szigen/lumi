import { useEffect } from 'react'
import { useNotificationStore } from '../stores/useNotificationStore'
import { useTerminalStore } from '../stores/useTerminalStore'
import { useAppStore } from '../stores/useAppStore'

export function useNotificationListener() {
  useEffect(() => {
    const cleanupBell = window.api.onTerminalBell((terminalId: string, repoName: string) => {
      const activeTerminalId = useTerminalStore.getState().activeTerminalId
      // Only show toast if this terminal is not currently active
      if (terminalId !== activeTerminalId) {
        useNotificationStore.getState().addToast(terminalId, repoName)
      }
    })

    const cleanupClick = window.api.onNotificationClick((terminalId: string) => {
      const { terminals, setActiveTerminal } = useTerminalStore.getState()
      const { openTabs, setActiveTab } = useAppStore.getState()

      const terminal = terminals.get(terminalId)
      if (terminal) {
        const repoName = terminal.repoPath.split('/').pop() || ''
        if (openTabs.includes(repoName)) {
          setActiveTab(repoName)
        }
        setActiveTerminal(terminalId)
      }
    })

    return () => {
      cleanupBell()
      cleanupClick()
    }
  }, [])
}
