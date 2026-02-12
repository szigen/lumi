import type { ComponentType } from 'react'

export type CheckStatus = 'pending' | 'running' | 'pass' | 'fail' | 'warn'

export interface SystemCheckResult {
  id: string
  label: string
  status: CheckStatus
  message: string
  fixable?: boolean
}

export interface StepProps {
  onNext: () => void
  onBack: () => void
  isFirst: boolean
  isLast: boolean
}

export interface OnboardingStep {
  id: string
  label: string
  component: ComponentType<StepProps>
}
