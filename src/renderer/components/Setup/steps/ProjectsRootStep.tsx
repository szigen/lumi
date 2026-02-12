import { useState } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen } from 'lucide-react'
import type { StepProps } from '../types'

export default function ProjectsRootStep({ onNext, onBack }: StepProps) {
  const [projectsRoot, setProjectsRoot] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleBrowse = async () => {
    const path = await window.api.openFolderDialog()
    if (path) setProjectsRoot(path)
  }

  const handleNext = async () => {
    if (!projectsRoot.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await window.api.setConfig({ projectsRoot: projectsRoot.trim() })
      onNext()
    } catch (error) {
      console.error('Failed to save config:', error)
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNext()
  }

  return (
    <motion.div
      className="onboarding__step-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="onboarding__step-title">Projects Folder</h2>
      <p className="onboarding__step-desc">
        Select the folder where your project repositories are located.
      </p>

      <div className="onboarding__field">
        <label className="onboarding__label">Projects Root</label>
        <div className="onboarding__input-row">
          <input
            type="text"
            className="onboarding__input"
            placeholder="~/Projects"
            value={projectsRoot}
            onChange={(e) => setProjectsRoot(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button className="onboarding__browse-btn" onClick={handleBrowse} type="button">
            <FolderOpen size={16} />
            Browse
          </button>
        </div>
      </div>

      <div className="onboarding__nav">
        <button className="onboarding__secondary-btn" onClick={onBack}>
          Back
        </button>
        <button
          className="onboarding__primary-btn"
          onClick={handleNext}
          disabled={!projectsRoot.trim() || isSubmitting}
        >
          {isSubmitting ? 'Saving…' : 'Next'}
        </button>
      </div>
    </motion.div>
  )
}
