import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import Header from '../Header/Header'
import LeftSidebar from '../LeftSidebar/LeftSidebar'
import RightSidebar from '../RightSidebar/RightSidebar'
import TerminalPanel from '../TerminalPanel/TerminalPanel'
import { Logo } from '../icons'

export default function Layout() {
  const [isInitializing, setIsInitializing] = useState(true)
  const { leftSidebarOpen, rightSidebarOpen, loadUIState } = useAppStore()
  const { loadRepos } = useRepoStore()

  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          loadUIState(),
          loadRepos()
        ])
      } catch (error) {
        console.error('Failed to initialize:', error)
      } finally {
        setIsInitializing(false)
      }
    }

    initialize()
  }, [loadUIState, loadRepos])

  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-bg-void flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-6"
        >
          <motion.div
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <Logo size={48} />
          </motion.div>
          <div className="flex flex-col items-center gap-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-text-primary font-medium"
            >
              AI Orchestrator
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-text-tertiary text-sm"
            >
              Initializing...
            </motion.div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-void overflow-hidden">
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] via-transparent to-transparent pointer-events-none" />

      <Header />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <AnimatePresence mode="wait">
          {leftSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 256, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="
                h-full flex-shrink-0 overflow-hidden
                bg-bg-secondary/80 backdrop-blur-glass
                border-r border-border-subtle
              "
            >
              <LeftSidebar />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <motion.main
          layout
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 overflow-hidden bg-bg-primary"
        >
          <TerminalPanel />
        </motion.main>

        {/* Right Sidebar */}
        <AnimatePresence mode="wait">
          {rightSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="
                h-full flex-shrink-0 overflow-hidden
                bg-bg-secondary/80 backdrop-blur-glass
                border-l border-border-subtle
              "
            >
              <RightSidebar />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
