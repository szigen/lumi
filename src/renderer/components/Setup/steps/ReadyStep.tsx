import { motion } from 'framer-motion'
import { CheckCircle2, Rocket } from 'lucide-react'
import type { StepProps } from '../types'

export default function ReadyStep({ onNext }: StepProps) {
  return (
    <motion.div
      className="onboarding__step-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="onboarding__check-icon"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      >
        <CheckCircle2 size={56} />
      </motion.div>
      <h2 className="onboarding__step-title">You're All Set</h2>
      <p className="onboarding__step-desc">
        Your environment is ready. Launch the dashboard and start orchestrating.
      </p>
      <button className="onboarding__primary-btn onboarding__launch-btn" onClick={onNext}>
        <Rocket size={16} />
        Launch Dashboard
      </button>
    </motion.div>
  )
}
