import { useState } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen } from 'lucide-react'
import { Logo } from '../icons'
import './SetupScreen.css'

interface Props {
  onComplete: () => void
}

export default function SetupScreen({ onComplete }: Props) {
  const [projectsRoot, setProjectsRoot] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleBrowse = async () => {
    const path = await window.api.openFolderDialog()
    if (path) {
      setProjectsRoot(path)
    }
  }

  const handleSubmit = async () => {
    if (!projectsRoot.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await window.api.setConfig({ projectsRoot: projectsRoot.trim() })
      onComplete()
    } catch (error) {
      console.error('Failed to save config:', error)
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="setup-screen">
      <motion.div
        className="setup-screen__card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Logo size={48} className="setup-screen__logo" />
        <h1 className="setup-screen__title">Welcome to AI Orchestrator</h1>
        <p className="setup-screen__desc">
          Select the folder where your project repositories are located.
        </p>

        <div className="setup-screen__field">
          <label className="setup-screen__label">Projects Root</label>
          <div className="setup-screen__input-row">
            <input
              type="text"
              className="setup-screen__input"
              placeholder="~/Projects"
              value={projectsRoot}
              onChange={(e) => setProjectsRoot(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button
              className="setup-screen__browse-btn"
              onClick={handleBrowse}
              type="button"
            >
              <FolderOpen size={16} />
              Browse
            </button>
          </div>
        </div>

        <button
          className="setup-screen__submit-btn"
          onClick={handleSubmit}
          disabled={!projectsRoot.trim() || isSubmitting}
        >
          {isSubmitting ? 'Setting up...' : 'Get Started'}
        </button>
      </motion.div>
    </div>
  )
}
