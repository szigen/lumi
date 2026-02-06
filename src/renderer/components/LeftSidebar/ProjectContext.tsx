import { useState, useEffect, useMemo, useCallback } from 'react'
import { FolderTree, ChevronDown, ChevronRight, Folder, FileText, Trash2, Copy, FolderOpen } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import type { FileTreeNode } from '../../../shared/types'
import ContextMenu, { type ContextMenuItem } from './ContextMenu'

interface TreeNodeProps {
  node: FileTreeNode
  depth: number
  onContextMenu: (e: React.MouseEvent, node: FileTreeNode) => void
}

function TreeNode({ node, depth, onContextMenu }: TreeNodeProps) {
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
    <div className="tree-node">
      <div
        className="tree-node__content"
        draggable
        onDragStart={handleDragStart}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onContextMenu(e, node)
        }}
        style={{ paddingLeft: depth > 0 ? 0 : undefined }}
      >
        {isFolder && hasChildren ? (
          expanded ? <ChevronDown size={12} className="chevron-icon" /> : <ChevronRight size={12} className="chevron-icon" />
        ) : (
          <span style={{ width: 12 }} />
        )}
        {isFolder ? (
          <Folder size={16} className="folder-icon" />
        ) : (
          <FileText size={16} className="file-icon" />
        )}
        <span className="tree-node__name">{node.name}</span>
      </div>

      {isFolder && expanded && hasChildren && (
        <div className="tree-children">
          {node.children!.map(child => (
            <TreeNode key={child.path} node={child} depth={depth + 1} onContextMenu={onContextMenu} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProjectContext() {
  const [treeCache, setTreeCache] = useState<Map<string, FileTreeNode[]>>(new Map())
  const [expanded, setExpanded] = useState(true)
  const [loading, setLoading] = useState(false)
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const [contextMenu, setContextMenu] = useState<{
    node: FileTreeNode
    x: number
    y: number
  } | null>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileTreeNode) => {
    setContextMenu({ node, x: e.clientX, y: e.clientY })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const activeRepo = useMemo(
    () => (activeTab ? getRepoByName(activeTab) : null),
    [activeTab, getRepoByName]
  )

  const activeRepoPath = activeRepo?.path

  // Listen for file tree changes from file system watcher
  useEffect(() => {
    const cleanup = window.api.onFileTreeChanged((changedRepoPath: string) => {
      setTreeCache(prev => {
        if (!prev.has(changedRepoPath)) return prev
        const next = new Map(prev)
        next.delete(changedRepoPath)
        return next
      })
    })
    return cleanup
  }, [])

  // Watch/unwatch active repo file tree
  useEffect(() => {
    if (!activeRepoPath) return
    window.api.watchFileTree(activeRepoPath)
    return () => { window.api.unwatchFileTree(activeRepoPath) }
  }, [activeRepoPath])

  useEffect(() => {
    if (!activeRepoPath) return
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

  const getContextMenuItems = useCallback((node: FileTreeNode): ContextMenuItem[] => {
    const items: ContextMenuItem[] = []

    if (node.type === 'file' && activeRepoPath) {
      items.push({
        label: 'Delete',
        icon: <Trash2 size={14} />,
        onClick: async () => {
          try {
            await window.api.deleteFile(activeRepoPath, node.path)
            // Invalidate tree cache to trigger re-fetch
            setTreeCache(prev => {
              const next = new Map(prev)
              next.delete(activeRepoPath)
              return next
            })
          } catch {
            // silently fail — file may already be deleted
          }
        }
      })
    }

    items.push({
      label: 'Copy Path',
      icon: <Copy size={14} />,
      onClick: () => {
        navigator.clipboard.writeText(node.path)
      }
    })

    if (activeRepoPath) {
      items.push({
        label: 'Reveal in Finder',
        icon: <FolderOpen size={14} />,
        onClick: () => {
          window.api.revealInFinder(activeRepoPath, node.path)
        }
      })
    }

    return items
  }, [activeRepoPath])

  return (
    <div className="sidebar-section file-tree-section">
      <button className="file-tree-header" onClick={() => setExpanded(!expanded)}>
        <FolderTree size={16} />
        <h3>Project Context</h3>
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {expanded && (
        <div className="file-tree">
          {!activeRepo ? (
            <p className="tree-empty">No repo selected</p>
          ) : loading ? (
            <p className="tree-empty">Loading...</p>
          ) : fileTree.length === 0 ? (
            <p className="tree-empty">Empty directory</p>
          ) : (
            <div>
              {fileTree.map(node => (
                <TreeNode key={node.path} node={node} depth={0} onContextMenu={handleContextMenu} />
              ))}
            </div>
          )}
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          items={getContextMenuItems(contextMenu.node)}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}
