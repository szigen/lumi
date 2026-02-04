import { useState, useEffect, useMemo, useCallback } from 'react'
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
    <div className="tree-node">
      <div
        className="tree-node__content"
        draggable
        onDragStart={handleDragStart}
        onClick={handleClick}
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
            <TreeNode key={child.path} node={child} depth={depth + 1} />
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

  const activeRepo = useMemo(
    () => (activeTab ? getRepoByName(activeTab) : null),
    [activeTab, getRepoByName]
  )

  const activeRepoPath = activeRepo?.path

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
                <TreeNode key={node.path} node={node} depth={0} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
