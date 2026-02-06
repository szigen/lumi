import { useState, useEffect, useRef } from 'react'
import { Trophy, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function CollectionProgress() {
  const [discovered, setDiscovered] = useState(0)
  const [total, setTotal] = useState(2500)
  const [justUpdated, setJustUpdated] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const prevDiscovered = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const fetchCollection = async () => {
      const data = await window.api.getCollection()
      if (data) {
        if (data.discovered > prevDiscovered.current && prevDiscovered.current > 0) {
          setJustUpdated(true)
          setTimeout(() => setJustUpdated(false), 2000)
        }
        prevDiscovered.current = data.discovered
        setDiscovered(data.discovered)
        setTotal(data.total)

        if (data.discovered === data.total && data.total > 0) {
          setShowConfetti(true)
        }
      }
    }

    const interval = setInterval(fetchCollection, 3000)
    fetchCollection()
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!showConfetti || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const particles: Array<{
      x: number; y: number; vx: number; vy: number
      size: number; color: string; life: number
    }> = []

    const colors = ['#a78bfa', '#8b5cf6', '#22d3ee', '#4ade80', '#fbbf24', '#f87171']

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 2,
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1
      })
    }

    let animId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false

      for (const p of particles) {
        if (p.life <= 0) continue
        alive = true
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.15
        p.life -= 0.015
        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, p.size, p.size)
      }

      ctx.globalAlpha = 1
      if (alive) {
        animId = requestAnimationFrame(animate)
      } else {
        setShowConfetti(false)
      }
    }

    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [showConfetti])

  const percentage = total > 0 ? (discovered / total) * 100 : 0
  const isComplete = discovered === total && total > 0

  return (
    <div className="sidebar-section collection-progress">
      <div className="section-header">
        <Trophy size={16} />
        <h3>Collection</h3>
        <span className="section-header__count">{discovered} / {total}</span>
      </div>

      <div className="collection-progress__bar-container">
        <motion.div
          className="collection-progress__bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      <AnimatePresence>
        {justUpdated && (
          <motion.div
            className="collection-progress__new-discovery"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
          >
            <Sparkles size={12} />
            <span>New codename discovered!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {isComplete && (
        <motion.div
          className="collection-progress__complete"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <span className="badge badge--success">COMPLETED</span>
        </motion.div>
      )}

      {showConfetti && (
        <canvas
          ref={canvasRef}
          className="collection-progress__confetti"
        />
      )}
    </div>
  )
}
