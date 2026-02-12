import { motion } from 'framer-motion'
import { Logo } from '../../icons'
import type { StepProps } from '../types'

export default function WelcomeStep({ onNext }: StepProps) {
  return (
    <motion.div
      className="onboarding__step-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <Logo size={56} className="onboarding__logo" animated />
      <h1 className="onboarding__title">Welcome to AI Orchestrator</h1>
      <p className="onboarding__desc">
        Manage multiple Claude Code CLI sessions from one dashboard.
        Let's get your environment set up.
      </p>
      <button className="onboarding__primary-btn" onClick={onNext}>
        Get Started
      </button>
    </motion.div>
  )
}
