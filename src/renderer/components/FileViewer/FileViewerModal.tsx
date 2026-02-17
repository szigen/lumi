import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, GitCompare } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import FileContentView from './FileContentView'
import FileDiffView from './FileDiffView'
import CommitDiffView from './CommitDiffView'

export default function FileViewerModal() {
  const fileViewer = useAppStore((s) => s.fileViewer)
  const closeFileViewer = useAppStore((s) => s.closeFileViewer)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeFileViewer()
    }
  }, [closeFileViewer])

  useEffect(() => {
    if (fileViewer?.isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [fileViewer?.isOpen, handleKeyDown])

  const getTitle = () => {
    if (!fileViewer) return ''
    if (fileViewer.mode === 'view') return fileViewer.filePath || 'File'
    if (fileViewer.mode === 'diff') return fileViewer.fileName || 'Diff'
    if (fileViewer.mode === 'commit-diff') return `Commit ${fileViewer.commitHash?.substring(0, 7) || ''}`
    return ''
  }

  const getIcon = () => {
    if (!fileViewer) return <FileText size={16} />
    if (fileViewer.mode === 'view') return <FileText size={16} />
    return <GitCompare size={16} />
  }

  return (
    <AnimatePresence>
      {fileViewer?.isOpen && (
        <motion.div
          className="file-viewer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={closeFileViewer}
        >
          <motion.div
            className="file-viewer-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="file-viewer-modal__header">
              <div className="file-viewer-modal__title">
                {getIcon()}
                <span>{getTitle()}</span>
              </div>
              <button className="file-viewer-modal__close" onClick={closeFileViewer}>
                <X size={16} />
              </button>
            </div>
            <div className="file-viewer-modal__body">
              {fileViewer.mode === 'view' && fileViewer.content && fileViewer.filePath && (
                <FileContentView content={fileViewer.content} filePath={fileViewer.filePath} />
              )}
              {fileViewer.mode === 'diff' && fileViewer.originalContent !== undefined && fileViewer.modifiedContent !== undefined && (
                <FileDiffView
                  original={fileViewer.originalContent}
                  modified={fileViewer.modifiedContent}
                  fileName={fileViewer.fileName || ''}
                />
              )}
              {fileViewer.mode === 'commit-diff' && fileViewer.commitFiles && fileViewer.commitHash && (
                <CommitDiffView
                  files={fileViewer.commitFiles}
                  commitHash={fileViewer.commitHash}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
