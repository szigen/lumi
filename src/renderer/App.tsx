import { useEffect } from 'react'
import Layout from './components/Layout'
import ErrorBoundary from './components/common/ErrorBoundary'

export default function App() {
  useEffect(() => {
    document.body.classList.add(`platform-${window.api?.platform || 'unknown'}`)
  }, [])

  useEffect(() => {
    const cleanup = window.api.onFullscreenChange((isFullscreen) => {
      document.body.classList.toggle('fullscreen', isFullscreen)
    })
    return cleanup
  }, [])

  return (
    <ErrorBoundary>
      <Layout />
    </ErrorBoundary>
  )
}
