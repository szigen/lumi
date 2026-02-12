import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { onboardingSteps } from './steps'
import './SetupScreen.css'

interface Props {
  onComplete: () => void
}

export default function SetupScreen({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0)

  const step = onboardingSteps[currentStep]
  const StepComponent = step.component

  const handleNext = useCallback(() => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      onComplete()
    }
  }, [currentStep, onComplete])

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }, [currentStep])

  return (
    <div className="onboarding">
      <div className="onboarding__stepper">
        {onboardingSteps.map((s, i) => (
          <div key={s.id} className="onboarding__stepper-item">
            {i > 0 && (
              <div
                className={`onboarding__stepper-line ${i <= currentStep ? 'onboarding__stepper-line--active' : ''}`}
              />
            )}
            <div
              className={`onboarding__step-dot ${
                i < currentStep
                  ? 'onboarding__step-dot--done'
                  : i === currentStep
                    ? 'onboarding__step-dot--active'
                    : ''
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`onboarding__step-label ${
                i === currentStep ? 'onboarding__step-label--active' : ''
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="onboarding__content">
        <AnimatePresence mode="wait">
          <StepComponent
            key={step.id}
            onNext={handleNext}
            onBack={handleBack}
            isFirst={currentStep === 0}
            isLast={currentStep === onboardingSteps.length - 1}
          />
        </AnimatePresence>
      </div>
    </div>
  )
}
