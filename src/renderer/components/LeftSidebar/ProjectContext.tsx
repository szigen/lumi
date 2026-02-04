import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderTree, ChevronDown, ChevronRight, Folder, FileText } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import type { FileTreeNode } from '../../../shared/types'

interface TreeNodeProps {
  node: FileTreeNode
  depth: number
}

function TreeNode({ node, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth === 0)

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.path)
    e.dataTransfer.effectAllowed = 'copy'
  }, [node.path])

  const handleClick = useCallback(() => {
    if (node.type === 'folder') {
      setExpanded(prev => !prev)
    }
  }, [node.type])

  const isFolder = node.type === 'folder'
  const hasChildren = isFolder && node.children && node.children.length > 0

  return (
    <div>
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        className="
          flex items-center gap-1.5 py-1 pr-2
          rounded hover:bg-surface-hover
          cursor-pointer select-none
          transition-colors duration-fast
          group
        "
      >
        {/* Expand/Collapse Icon */}
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {isFolder && hasChildren && (
            <motion.span
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight className="w-3 h-3 text-text-tertiary" />
            </motion.span>
          )}
        </span>

        {/* Icon */}
        {isFolder ? (
          <Folder className="w-4 h-4 text-accent flex-shrink-0" />
        ) : (
          <FileText className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        )}

        {/* Name */}
        <span className="text-sm text-text-secondary truncate group-hover:text-text-primary transition-colors">
          {node.name}
        </span>
      </div>

      {/* Children */}
      <AnimatePresence>
        {isFolder && expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children!.map(child => (
              <TreeNode key={child.path} node={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ProjectContext() {
  const [treeCache, setTreeCache] = useState<Map<string, FileTreeNode[]>>(new Map())
  const [expanded, setExpanded] = useState(true)
  const [loading, setLoading] = useState(false)
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = useMemo(
    () => (activeTab ? getRepoByName(activeTab) : null),
    [activeTab, getRepoByName]
  )

  const activeRepoPath = activeRepo?.path

  useEffect(() => {
    if (!activeRepoPath) return

    // Check cache first
    if (treeCache.has(activeRepoPath)) return

    setLoading(true)
    window.api.getFileTree(activeRepoPath).then((tree) => {
      setTreeCache(prev => new Map(prev).set(activeRepoPath, tree as FileTreeNode[]))
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [activeRepoPath, treeCache])

  const fileTree = activeRepoPath ? treeCache.get(activeRepoPath) ?? [] : []

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

      {/* File Tree */}
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
            ) : loading ? (
              <div className="px-1 space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-5 animate-shimmer rounded" />
                ))}
              </div>
            ) : fileTree.length === 0 ? (
              <p className="text-text-tertiary text-sm px-1">Empty directory</p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {fileTree.map(node => (
                  <TreeNode key={node.path} node={node} depth={0} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
