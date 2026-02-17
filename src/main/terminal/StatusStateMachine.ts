import type { TerminalStatus } from '../../shared/types'

export class StatusStateMachine {
  private status: TerminalStatus = 'idle'
  private focused: boolean = false
  private windowFocused: boolean = true
  private onChange: ((status: TerminalStatus) => void) | null = null

  getStatus(): TerminalStatus {
    return this.status
  }

  setOnChange(cb: (status: TerminalStatus) => void): void {
    this.onChange = cb
  }

  /** Called when PTY title sequence is parsed */
  onTitleChange(isWorking: boolean): void {
    if (isWorking && this.status !== 'working') {
      this.transition('working')
    } else if (!isWorking && this.status === 'working') {
      // Assistant finished — transition based on focus
      this.transition(this.effectivelyFocused ? 'waiting-focused' : 'waiting-unseen')
    }
  }

  /** Called when PTY output activity detected (for non-OSC-title providers) */
  onOutputActivity(): void {
    if (this.status !== 'working') {
      this.transition('working')
    }
  }

  /** Called when activity timeout expires (no output for N seconds) */
  onOutputSilence(): void {
    if (this.status === 'working') {
      this.transition(this.effectivelyFocused ? 'waiting-focused' : 'waiting-unseen')
    }
  }

  /** Called when user sends input (Enter key) to a non-idle terminal */
  onUserInput(): void {
    if (this.status !== 'idle' && this.status !== 'error') {
      this.transition('working')
    }
  }

  /** Called when user focuses this terminal's tab */
  onFocus(): void {
    this.focused = true
    if (this.effectivelyFocused && (this.status === 'waiting-unseen' || this.status === 'waiting-seen')) {
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

  /** Called when the app window gains OS-level focus */
  onWindowFocus(): void {
    this.windowFocused = true
    if (this.focused && (this.status === 'waiting-unseen' || this.status === 'waiting-seen')) {
      this.transition('waiting-focused')
    }
  }

  /** Called when the app window loses OS-level focus */
  onWindowBlur(): void {
    this.windowFocused = false
    if (this.status === 'waiting-focused') {
      this.transition('waiting-seen')
    }
  }

  /** Called when PTY process exits — normal exit goes idle, abnormal goes error */
  onExit(exitCode: number): void {
    this.transition(exitCode === 0 ? 'idle' : 'error')
  }

  /** Called on restart/respawn */
  reset(): void {
    this.transition('idle')
  }

  /** Terminal is effectively focused only when both tab is active AND window is focused */
  private get effectivelyFocused(): boolean {
    return this.focused && this.windowFocused
  }

  private transition(newStatus: TerminalStatus): void {
    if (this.status === newStatus) return
    this.status = newStatus
    this.onChange?.(newStatus)
  }
}
