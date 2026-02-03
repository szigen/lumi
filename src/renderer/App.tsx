import Layout from './components/Layout'
import ErrorBoundary from './components/common/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <Layout />
    </ErrorBoundary>
  )
}
