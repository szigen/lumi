import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderTree, ChevronDown, ChevronRight, Folder, FileText } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'

export default function ProjectContext() {
  const [files, setFiles] = useState<string[]>([])
  const [expanded, setExpanded] = useState(true)
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null

  useEffect(() => {
    if (activeRepo) {
      window.api.getRepoFiles(activeRepo.path).then(setFiles)
    } else {
      setFiles([])
    }
  }, [activeRepo])

  const directories = files.filter(f => f.endsWith('/'))
  const regularFiles = files.filter(f => !f.endsWith('/'))

  return (
    <div className="mb-5">
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="
          w-full flex items-center gap-2 px-1 mb-3
          text-left group
        "
      >
        <FolderTree className="w-4 h-4 text-text-tertiary" />
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Project Context
        </h3>
        <motion.span
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ duration: 0.15 }}
          className="ml-auto text-text-tertiary"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </button>

      {/* File List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {!activeRepo ? (
              <p className="text-text-tertiary text-sm px-1">No repo selected</p>
            ) : files.length === 0 ? (
              <div className="px-1 space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-5 animate-shimmer rounded" />
                ))}
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {directories.slice(0, 10).map((file, index) => (
                  <motion.div
                    key={file}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="
                      flex items-center gap-2 px-1.5 py-1
                      rounded hover:bg-surface-hover
                      transition-colors duration-fast
                    "
                  >
                    <Folder className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span className="text-sm text-text-secondary truncate">
                      {file}
                    </span>
                  </motion.div>
                ))}
                {regularFiles.slice(0, 10).map((file, index) => (
                  <motion.div
                    key={file}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (directories.slice(0, 10).length + index) * 0.02 }}
                    className="
                      flex items-center gap-2 px-1.5 py-1
                      rounded hover:bg-surface-hover
                      transition-colors duration-fast
                    "
                  >
                    <FileText className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                    <span className="text-sm text-text-secondary truncate">
                      {file}
                    </span>
                  </motion.div>
                ))}
                {files.length > 20 && (
                  <div className="px-1.5 py-1 text-xs text-text-tertiary">
                    ... and {files.length - 20} more
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
