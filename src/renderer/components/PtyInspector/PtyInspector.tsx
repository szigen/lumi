import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FolderOpen, FileText, Activity } from 'lucide-react'

export default function PtyInspector() {
  const [isOpen, setIsOpen] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [logPath, setLogPath] = useState<string | null>(null)
  const [stats, setStats] = useState({ activeStreams: 0, totalChunks: 0 })
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  // Listen for toggle event from keyboard shortcut / menu
  useEffect(() => {
    const handler = () => handleToggle()
    window.addEventListener('toggle-pty-inspector', handler)
    return () => window.removeEventListener('toggle-pty-inspector', handler)
  }, [handleToggle])

  // Poll stats while open and enabled
  useEffect(() => {
    if (!isOpen || !enabled) {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }

    const poll = async () => {
      const [path, s] = await Promise.all([
        window.api.getPtyInspectorLogPath(),
        window.api.getPtyInspectorStats()
      ])
      setLogPath(path)
      setStats(s)
    }

    poll()
    pollRef.current = setInterval(poll, 1000)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [isOpen, enabled])

  // Disable logger when panel closes
  const prevOpenRef = useRef(isOpen)
  useEffect(() => {
    if (prevOpenRef.current && !isOpen) {
      // Panel just closed — disable via IPC only, reset local state via microtask
      window.api.setPtyInspectorEnabled(false)
      queueMicrotask(() => {
        setEnabled(false)
        setLogPath(null)
        setStats({ activeStreams: 0, totalChunks: 0 })
      })
    }
    prevOpenRef.current = isOpen
  })

  const handleEnableToggle = async () => {
    const next = !enabled
    setEnabled(next)
    await window.api.setPtyInspectorEnabled(next)
    if (next) {
      const [path, s] = await Promise.all([
        window.api.getPtyInspectorLogPath(),
        window.api.getPtyInspectorStats()
      ])
      setLogPath(path)
      setStats(s)
    } else {
      setLogPath(null)
      setStats({ activeStreams: 0, totalChunks: 0 })
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="pty-inspector"
          initial={{ y: 300, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 300, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="pty-inspector__header">
            <div className="pty-inspector__title">PTY Raw Logger</div>

            <button
              className={`pty-inspector__toggle ${enabled ? 'pty-inspector__toggle--on' : ''}`}
              onClick={handleEnableToggle}
            >
              <span className="pty-inspector__toggle-thumb" />
              <span className="pty-inspector__toggle-label">{enabled ? 'ON' : 'OFF'}</span>
            </button>

            <div className="pty-inspector__actions">
              <button
                className="pty-inspector__btn"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="pty-inspector__body">
            {!enabled ? (
              <div className="pty-inspector__empty">
                Toggle ON to start logging raw PTY data to disk.
                <br />
                <span className="pty-inspector__hint">All visible text + escape sequences will be captured.</span>
              </div>
            ) : (
              <div className="pty-inspector__info">
                <div className="pty-inspector__stat-row">
                  <Activity size={14} />
                  <span className="pty-inspector__stat-label">Active Streams</span>
                  <span className="pty-inspector__stat-value">{stats.activeStreams}</span>
                </div>

                <div className="pty-inspector__stat-row">
                  <FileText size={14} />
                  <span className="pty-inspector__stat-label">Total Chunks</span>
                  <span className="pty-inspector__stat-value">{stats.totalChunks}</span>
                </div>

                {logPath && (
                  <div className="pty-inspector__path-section">
                    <div className="pty-inspector__path-label">Log Directory</div>
                    <div className="pty-inspector__path-value">{logPath}</div>
                    <button
                      className="pty-inspector__open-btn"
                      onClick={() => {
                        if (logPath) {
                          window.api.revealInFinder(logPath, '.')
                        }
                      }}
                    >
                      <FolderOpen size={13} />
                      Open in Finder
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
