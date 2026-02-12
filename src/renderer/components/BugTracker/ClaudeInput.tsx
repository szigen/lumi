import { useState } from 'react'
import { Send, Loader } from 'lucide-react'
import { useBugStore } from '../../stores/useBugStore'

interface ClaudeInputProps {
  repoPath: string
}

export default function ClaudeInput({ repoPath }: ClaudeInputProps) {
  const [input, setInput] = useState('')
  const { selectedBugId, claudeLoading, askClaude } = useBugStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !selectedBugId || claudeLoading) return
    const msg = input.trim()
    setInput('')
    await askClaude(repoPath, selectedBugId, msg)
  }

  return (
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
  )
}
