import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mascot } from '../../icons'
import type { StepProps } from '../types'
import type { AIProvider } from '../../../../shared/ai-provider'

export default function WelcomeStep({ onNext }: StepProps) {
  const [provider, setProvider] = useState<AIProvider>('claude')

  const handleNext = async () => {
    try {
      await window.api.setConfig({ aiProvider: provider })
    } catch (error) {
      console.error('Failed to save AI provider:', error)
    }
    onNext()
  }

  return (
    <motion.div
      className="onboarding__step-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <Mascot variant="onboarding" size={120} className="onboarding__logo" />
      <h1 className="onboarding__title">Welcome to Lumi</h1>
      <p className="onboarding__desc">
        Manage multiple AI coding CLI sessions from one dashboard.
        Let's get your environment set up.
      </p>
      <div className="settings-theme-options" style={{ marginBottom: 16 }}>
        {(['claude', 'codex'] as AIProvider[]).map((item) => (
          <button
            key={item}
            className={`settings-theme-btn ${provider === item ? 'settings-theme-btn--active' : ''}`}
            onClick={() => setProvider(item)}
          >
            {item === 'codex' ? 'Codex' : 'Claude'}
          </button>
        ))}
      </div>
      <button className="onboarding__primary-btn" onClick={handleNext}>
        Get Started
      </button>
    </motion.div>
  )
}
