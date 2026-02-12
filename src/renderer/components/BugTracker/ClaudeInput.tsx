import { useState, useRef, useEffect } from 'react'
import { Send, Loader, FileText, Search, Terminal, FolderSearch, Pencil } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBugStore } from '../../stores/useBugStore'

const TOOL_LABELS: Record<string, { label: string; icon: typeof FileText }> = {
  Read: { label: 'Reading file', icon: FileText },
  Grep: { label: 'Searching codebase', icon: Search },
  Bash: { label: 'Running command', icon: Terminal },
  Glob: { label: 'Finding files', icon: FolderSearch },
  Edit: { label: 'Editing file', icon: Pencil },
  Write: { label: 'Writing file', icon: Pencil },
}

function getToolDisplay(tool?: string) {
  if (!tool) return null
  return TOOL_LABELS[tool] || { label: `Using ${tool}`, icon: Terminal }
}

interface ClaudeInputProps {
  repoPath: string
}

export default function ClaudeInput({ repoPath }: ClaudeInputProps) {
  const [input, setInput] = useState('')
  const { selectedBugId, claudeLoading, askClaude, streamingBugId, streamingText, streamingActivities } = useBugStore()
  const previewRef = useRef<HTMLDivElement>(null)

  const showPreview = streamingBugId === selectedBugId && (streamingText.length > 0 || streamingActivities.length > 0)

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight
    }
  }, [streamingText, streamingActivities])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !selectedBugId || claudeLoading) return
    const msg = input.trim()
    setInput('')
    await askClaude(repoPath, selectedBugId, msg)
  }

  const displayText = streamingText.length > 300 ? '…' + streamingText.slice(-300) : streamingText

  // Build a list of active tools (tool_start without a matching tool_end)
  const activeTools: string[] = []
  const toolStack: string[] = []
  for (const activity of streamingActivities) {
    if (activity.type === 'tool_start' && activity.tool) {
      toolStack.push(activity.tool)
    } else if (activity.type === 'tool_end') {
      toolStack.pop()
    }
  }
  activeTools.push(...toolStack)

  // Count completed tools
  let completedToolCount = 0
  for (const activity of streamingActivities) {
    if (activity.type === 'tool_end') completedToolCount++
  }

  return (
    <div className="claude-input-wrapper">
      <AnimatePresence>
        {showPreview && (
          <motion.div
            className="claude-stream-preview"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="claude-stream-preview__content" ref={previewRef}>
              {streamingActivities.length > 0 && !streamingText && (
                <div className="claude-stream-activities">
                  {completedToolCount > 0 && (
                    <span className="claude-stream-activity claude-stream-activity--done">
                      {completedToolCount} tool{completedToolCount > 1 ? 's' : ''} used
                    </span>
                  )}
                  {activeTools.map((tool, i) => {
                    const display = getToolDisplay(tool)
                    if (!display) return null
                    const Icon = display.icon
                    return (
                      <motion.span
                        key={`${tool}-${i}`}
                        className="claude-stream-activity claude-stream-activity--active"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Icon size={12} />
                        {display.label}...
                      </motion.span>
                    )
                  })}
                </div>
              )}
              {streamingText && (
                <>
                  {activeTools.length > 0 && (
                    <div className="claude-stream-activities claude-stream-activities--inline">
                      {activeTools.map((tool, i) => {
                        const display = getToolDisplay(tool)
                        if (!display) return null
                        const Icon = display.icon
                        return (
                          <motion.span
                            key={`${tool}-${i}`}
                            className="claude-stream-activity claude-stream-activity--active"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <Icon size={12} />
                            {display.label}...
                          </motion.span>
                        )
                      })}
                    </div>
                  )}
                  {displayText}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <form className="claude-input" onSubmit={handleSubmit}>
        <input
          className="claude-input__field"
          placeholder={selectedBugId ? 'Ask Claude about this bug...' : 'Select a bug first...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!selectedBugId || claudeLoading}
        />
        <button
          type="submit"
          className="claude-input__btn"
          disabled={!input.trim() || !selectedBugId || claudeLoading}
        >
          {claudeLoading ? <Loader size={16} className="claude-input__spinner" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  )
}
