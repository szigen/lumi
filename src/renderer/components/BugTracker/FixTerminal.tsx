import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { useBugStore } from '../../stores/useBugStore'
import { useTerminalStore } from '../../stores/useTerminalStore'
import Terminal from '../Terminal/Terminal'

interface FixTerminalProps {
  repoPath: string
}

export default function FixTerminal({ repoPath }: FixTerminalProps) {
  const fixTerminalId = useBugStore((s) => s.fixTerminalId)
  const selectedBugId = useBugStore((s) => s.selectedBugId)
  const applyingFixId = useBugStore((s) => s.applyingFixId)
  const markFixResult = useBugStore((s) => s.markFixResult)
  const clearFixTerminal = useBugStore((s) => s.clearFixTerminal)
  const removeTerminal = useTerminalStore((s) => s.removeTerminal)
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState('')

  if (!fixTerminalId) {
    return (
      <div className="fix-terminal__empty">
        Select a fix and click "Apply" to start
      </div>
    )
  }

  const handleSuccess = async () => {
    if (!selectedBugId || !applyingFixId) return
    try {
      await markFixResult(repoPath, selectedBugId, applyingFixId, true)
      window.api.killTerminal(fixTerminalId)
      removeTerminal(fixTerminalId)
    } catch (err) {
      console.error('Failed to mark fix as success:', err)
    }
  }

  const handleFail = async () => {
    if (!selectedBugId || !applyingFixId) return
    if (!showNote) {
      setShowNote(true)
      return
    }
    try {
      await markFixResult(repoPath, selectedBugId, applyingFixId, false, note || undefined)
      window.api.killTerminal(fixTerminalId)
      removeTerminal(fixTerminalId)
      setShowNote(false)
      setNote('')
    } catch (err) {
      console.error('Failed to mark fix as failed:', err)
    }
  }

  const handleClose = () => {
    window.api.killTerminal(fixTerminalId)
    removeTerminal(fixTerminalId)
    clearFixTerminal()
  }

  return (
    <div className="fix-terminal">
      <div className="fix-terminal__controls">
        <button className="fix-terminal__btn fix-terminal__btn--success" onClick={handleSuccess} aria-label="Mark fix as successful">
          <CheckCircle size={14} /> Fixed
        </button>
        <button className="fix-terminal__btn fix-terminal__btn--fail" onClick={handleFail} aria-label="Mark fix as failed">
          <XCircle size={14} /> Not Fixed
        </button>
      </div>
      {showNote && (
        <div className="fix-terminal__note">
          <label htmlFor="fix-note-input" className="visually-hidden">Why didn&apos;t it work?</label>
          <input
            id="fix-note-input"
            className="fix-terminal__note-input"
            placeholder="Why didn't it work? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFail() }}
            autoFocus
          />
        </div>
      )}
      <div className="fix-terminal__terminal">
        <Terminal terminalId={fixTerminalId} onClose={handleClose} />
      </div>
    </div>
  )
}
