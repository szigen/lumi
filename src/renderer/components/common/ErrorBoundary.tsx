import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: '#0a0a12',
          color: '#8888a8',
          fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'SF Mono', 'Menlo', 'Consolas', monospace",
          padding: '24px',
          textAlign: 'center' as const,
        }}>
          <h2 style={{ color: '#a78bfa', fontSize: '18px', marginBottom: '12px' }}>
            Something went wrong
          </h2>
          <p style={{ marginBottom: '20px', maxWidth: '480px', lineHeight: 1.6 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              background: '#1a1a2e',
              color: '#e2e2f0',
              border: '1px solid #2a2a4a',
              borderRadius: '6px',
              padding: '8px 20px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '13px',
            }}
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
