import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { useBugStore } from '../../stores/useBugStore'
import { useTerminalStore } from '../../stores/useTerminalStore'
import Terminal from '../Terminal/Terminal'

interface FixTerminalProps {
  repoPath: string
}

export default function FixTerminal({ repoPath }: FixTerminalProps) {
  const { fixTerminalId, selectedBugId, applyingFixId, markFixResult, clearFixTerminal } = useBugStore()
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
    await markFixResult(repoPath, selectedBugId, applyingFixId, true)
    window.api.killTerminal(fixTerminalId)
    removeTerminal(fixTerminalId)
  }

  const handleFail = async () => {
    if (!selectedBugId || !applyingFixId) return
    if (!showNote) {
      setShowNote(true)
      return
    }
    await markFixResult(repoPath, selectedBugId, applyingFixId, false, note || undefined)
    window.api.killTerminal(fixTerminalId)
    removeTerminal(fixTerminalId)
    setShowNote(false)
    setNote('')
  }

  const handleClose = () => {
    window.api.killTerminal(fixTerminalId)
    removeTerminal(fixTerminalId)
    clearFixTerminal()
  }

  return (
    <div className="fix-terminal">
      <div className="fix-terminal__controls">
        <button className="fix-terminal__btn fix-terminal__btn--success" onClick={handleSuccess}>
          <CheckCircle size={14} /> Fixed
        </button>
        <button className="fix-terminal__btn fix-terminal__btn--fail" onClick={handleFail}>
          <XCircle size={14} /> Not Fixed
        </button>
      </div>
      {showNote && (
        <div className="fix-terminal__note">
          <input
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
