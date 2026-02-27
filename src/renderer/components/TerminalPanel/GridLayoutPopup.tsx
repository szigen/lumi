import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, Columns3, Rows3 } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import type { GridLayoutMode } from '../../../shared/types'

interface GridLayoutPopupProps {
  repoPath: string
  iconSize?: number
}

const COUNTS = [2, 3, 4, 5] as const

export default function GridLayoutPopup({ repoPath, iconSize = 16 }: GridLayoutPopupProps) {
  const layout = useAppStore((s) => s.getActiveGridLayout())
  const setProjectGridLayout = useAppStore((s) => s.setProjectGridLayout)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      return () => document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen, handleOutsideClick])

  const handleSelect = (mode: GridLayoutMode, count: number) => {
    setProjectGridLayout(repoPath, { mode, count })
  }

  const GridIcon = layout.mode === 'columns' ? Columns3
    : layout.mode === 'rows' ? Rows3
    : LayoutGrid

  const tooltip = layout.mode === 'auto' ? 'Auto grid'
    : layout.mode === 'columns' ? `${layout.count} columns`
    : `${layout.count} rows`

  return (
    <div className="grid-layout-popup" ref={containerRef}>
      <button
        className="grid-layout-popup__trigger"
        onClick={() => setIsOpen(!isOpen)}
        title={tooltip}
      >
        <GridIcon size={iconSize} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="grid-layout-popup__menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <button
              className={`grid-layout-popup__item${layout.mode === 'auto' ? ' grid-layout-popup__item--active' : ''}`}
              onClick={() => handleSelect('auto', 2)}
            >
              <LayoutGrid size={14} />
              <span>Auto</span>
            </button>

            <div className="grid-layout-popup__separator" />

            <div className="grid-layout-popup__section">
              <span className="grid-layout-popup__label">Columns</span>
              <div className="grid-layout-popup__counts">
                {COUNTS.map((n) => (
                  <button
                    key={`col-${n}`}
                    className={`grid-layout-popup__count${layout.mode === 'columns' && layout.count === n ? ' grid-layout-popup__count--active' : ''}`}
                    onClick={() => handleSelect('columns', n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid-layout-popup__separator" />

            <div className="grid-layout-popup__section">
              <span className="grid-layout-popup__label">Rows</span>
              <div className="grid-layout-popup__counts">
                {COUNTS.map((n) => (
                  <button
                    key={`row-${n}`}
                    className={`grid-layout-popup__count${layout.mode === 'rows' && layout.count === n ? ' grid-layout-popup__count--active' : ''}`}
                    onClick={() => handleSelect('rows', n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
