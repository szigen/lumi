import type { OnboardingStep } from './types'
import WelcomeStep from './steps/WelcomeStep'
import SystemChecksStep from './steps/SystemChecksStep'
import ProjectsRootStep from './steps/ProjectsRootStep'
import ReadyStep from './steps/ReadyStep'

export const onboardingSteps: OnboardingStep[] = [
  { id: 'welcome', label: 'Welcome', component: WelcomeStep },
  { id: 'system-checks', label: 'System Checks', component: SystemChecksStep },
  { id: 'projects-root', label: 'Projects', component: ProjectsRootStep },
  { id: 'ready', label: 'Ready', component: ReadyStep }
]
