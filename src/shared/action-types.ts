export type ActionStep =
  | { type: 'write'; content: string }
  | { type: 'wait_for'; pattern: string; timeout?: number }
  | { type: 'delay'; ms: number }

export interface Action {
  id: string
  label: string
  icon: string
  scope: 'user' | 'project'
  steps: ActionStep[]
}
