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

function ToolActivityItem({ tool, index }: { tool: string; index: number }) {
  const display = getToolDisplay(tool)
  if (!display) return null
  const Icon = display.icon
  return (
    <motion.span
      key={`${tool}-${index}`}
      className="claude-stream-activity claude-stream-activity--active"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
    >
      <Icon size={12} />
      {display.label}...
    </motion.span>
  )
}

interface ClaudeInputProps {
  repoPath: string
}

const DISPLAY_TEXT_LIMIT = 300

export default function ClaudeInput({ repoPath }: ClaudeInputProps) {
  const [input, setInput] = useState('')
  const selectedBugId = useBugStore((s) => s.selectedBugId)
  const claudeLoading = useBugStore((s) => s.claudeLoading)
  const askClaude = useBugStore((s) => s.askClaude)
  const streamingBugId = useBugStore((s) => s.streamingBugId)
  const streamingText = useBugStore((s) => s.streamingText)
  const streamingActivities = useBugStore((s) => s.streamingActivities)
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
    try {
      await askClaude(repoPath, selectedBugId, msg)
    } catch (err) {
      console.error('Failed to ask Claude:', err)
    }
  }

  const displayText = streamingText.length > DISPLAY_TEXT_LIMIT ? '…' + streamingText.slice(-DISPLAY_TEXT_LIMIT) : streamingText

  // Build a list of active tools (tool_start without a matching tool_end)
  const toolStack: string[] = []
  let completedToolCount = 0
  for (const activity of streamingActivities) {
    if (activity.type === 'tool_start' && activity.tool) {
      toolStack.push(activity.tool)
    } else if (activity.type === 'tool_end') {
      toolStack.pop()
      completedToolCount++
    }
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
                  {toolStack.map((tool, i) => (
                    <ToolActivityItem key={`${tool}-${i}`} tool={tool} index={i} />
                  ))}
                </div>
              )}
              {streamingText && (
                <>
                  {toolStack.length > 0 && (
                    <div className="claude-stream-activities claude-stream-activities--inline">
                      {toolStack.map((tool, i) => (
                        <ToolActivityItem key={`${tool}-${i}`} tool={tool} index={i} />
                      ))}
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
        <label htmlFor="claude-input-field" className="visually-hidden">Ask Claude about this bug</label>
        <input
          id="claude-input-field"
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
          aria-label={claudeLoading ? 'Claude is thinking...' : 'Send message to Claude'}
        >
          {claudeLoading ? <Loader size={16} className="claude-input__spinner" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  )
}
