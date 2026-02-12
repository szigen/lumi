export type ClaudeStatus = 'idle' | 'working' | 'waiting-unseen' | 'waiting-focused' | 'waiting-seen' | 'error'

export class StatusStateMachine {
  private status: ClaudeStatus = 'idle'
  private focused: boolean = false
  private onChange: ((status: ClaudeStatus) => void) | null = null

  getStatus(): ClaudeStatus {
    return this.status
  }

  setOnChange(cb: (status: ClaudeStatus) => void): void {
    this.onChange = cb
  }

  /** Called when PTY title sequence is parsed */
  onTitleChange(isWorking: boolean): void {
    if (isWorking && this.status !== 'working') {
      this.transition('working')
    } else if (!isWorking && this.status === 'working') {
      // Claude finished — transition based on focus
      this.transition(this.focused ? 'waiting-focused' : 'waiting-unseen')
    }
  }

  /** Called when user focuses this terminal's tab */
  onFocus(): void {
    this.focused = true
    if (this.status === 'waiting-unseen' || this.status === 'waiting-seen') {
      this.transition('waiting-focused')
    }
  }

  /** Called when user unfocuses this terminal's tab */
  onBlur(): void {
    this.focused = false
    if (this.status === 'waiting-focused') {
      this.transition('waiting-seen')
    }
  }

  /** Called when PTY process exits */
  onExit(): void {
    this.transition('error')
  }

  /** Called on restart/respawn */
  reset(): void {
    this.transition('idle')
  }

  private transition(newStatus: ClaudeStatus): void {
    if (this.status === newStatus) return
    this.status = newStatus
    this.onChange?.(newStatus)
  }
}
