import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import type { StepProps, SystemCheckResult, CheckStatus } from '../types'

const STATUS_ICON: Record<CheckStatus, React.ReactNode> = {
  pending: <Loader2 size={16} className="system-check__icon--pending" />,
  running: <Loader2 size={16} className="system-check__icon--running" />,
  pass: <CheckCircle2 size={16} />,
  fail: <XCircle size={16} />,
  warn: <AlertTriangle size={16} />
}

export default function SystemChecksStep({ onNext, onBack }: StepProps) {
  const [checks, setChecks] = useState<SystemCheckResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runChecks = useCallback(async () => {
    setIsRunning(true)
    setChecks([])
    try {
      const results = await window.api.runSystemChecks() as SystemCheckResult[]
      setChecks(results)
    } catch (err) {
      console.error('System checks failed:', err)
    } finally {
      setIsRunning(false)
    }
  }, [])

  useEffect(() => {
    runChecks()
  }, [runChecks])

  const handleFix = async (checkId: string) => {
    try {
      const result = await window.api.fixSystemCheck(checkId) as SystemCheckResult
      setChecks((prev) => prev.map((c) => (c.id === result.id ? result : c)))
    } catch (err) {
      console.error('Fix failed:', err)
    }
  }

  const hasFail = checks.some((c) => c.status === 'fail')
  const allDone = checks.length > 0 && !isRunning

  return (
    <motion.div
      className="onboarding__step-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="onboarding__step-title">System Health Check</h2>
      <p className="onboarding__step-desc">
        Verifying your environment is ready for AI Orchestrator.
      </p>

      <div className="system-check__list">
        {isRunning && checks.length === 0 && (
          <div className="system-check system-check--loading">
            <Loader2 size={16} className="system-check__icon--running" />
            <span>Running checks…</span>
          </div>
        )}

        {checks.map((check) => (
          <div key={check.id} className={`system-check system-check--${check.status}`}>
            <div className="system-check__row">
              <span className={`system-check__status system-check__status--${check.status}`}>
                {STATUS_ICON[check.status]}
              </span>
              <span className="system-check__label">{check.label}</span>
            </div>
            <div className="system-check__detail">
              <span className="system-check__message">{check.message}</span>
              {check.fixable && check.status === 'fail' && (
                <button className="system-check__fix-btn" onClick={() => handleFix(check.id)}>
                  Fix
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="onboarding__nav">
        <button className="onboarding__secondary-btn" onClick={onBack}>
          Back
        </button>
        <div className="onboarding__nav-right">
          {allDone && (
            <button className="onboarding__ghost-btn" onClick={runChecks}>
              <RefreshCw size={14} />
              Re-run All
            </button>
          )}
          <button
            className="onboarding__primary-btn"
            onClick={onNext}
            disabled={hasFail}
            title={hasFail ? 'Fix all failures before proceeding' : ''}
          >
            Next
          </button>
        </div>
      </div>
    </motion.div>
  )
}
