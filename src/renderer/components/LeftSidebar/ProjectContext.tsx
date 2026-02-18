import { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react'
import { FolderTree, ChevronDown, ChevronRight, Folder, FileText, Trash2, Copy, FolderOpen, Search } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import type { FileTreeNode } from '../../../shared/types'
import ContextMenu, { type ContextMenuItem } from './ContextMenu'
import { SearchInput } from '../ui'

interface TreeNodeProps {
  node: FileTreeNode
  depth: number
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  onContextMenu: (e: React.MouseEvent, node: FileTreeNode) => void
  onFileClick?: (filePath: string) => void
}

function filterTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  const lowerQuery = query.toLowerCase()
  return nodes.reduce<FileTreeNode[]>((acc, node) => {
    const nameMatch = node.name.toLowerCase().includes(lowerQuery)
    if (node.type === 'folder' && node.children) {
      const filteredChildren = filterTree(node.children, query)
      if (nameMatch || filteredChildren.length > 0) {
        acc.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children })
      }
    } else if (nameMatch) {
      acc.push(node)
    }
    return acc
  }, [])
}

function collectAllDirPaths(nodes: FileTreeNode[]): Set<string> {
  const paths = new Set<string>()
  for (const node of nodes) {
    if (node.type === 'folder') {
      paths.add(node.path)
      if (node.children) {
        for (const p of collectAllDirPaths(node.children)) {
          paths.add(p)
        }
      }
    }
  }
  return paths
}

function TreeNode({ node, depth, expandedPaths, onToggle, onContextMenu, onFileClick }: TreeNodeProps) {
  const isFolder = node.type === 'folder'
  const hasChildren = isFolder && node.children && node.children.length > 0
  const isExpanded = expandedPaths.has(node.path)

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.path)
    e.dataTransfer.effectAllowed = 'copy'
  }, [node.path])

  const handleClick = useCallback(() => {
    if (isFolder) {
      onToggle(node.path)
    } else {
      onFileClick?.(node.path)
    }
  }, [isFolder, onToggle, onFileClick, node.path])

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
          isExpanded ? <ChevronDown size={12} className="chevron-icon" /> : <ChevronRight size={12} className="chevron-icon" />
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

      {isFolder && isExpanded && hasChildren && (
        <div className="tree-children">
          {node.children!.map(child => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onContextMenu={onContextMenu}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProjectContext() {
  const [treeCache, setTreeCache] = useState<Map<string, FileTreeNode[]>>(new Map())
  const [expandedMap, setExpandedMap] = useState<Map<string, Set<string>>>(new Map())
  const [expanded, setExpanded] = useState(true)
  const [loading, setLoading] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [filterText, setFilterText] = useState('')
  const savedExpandedRef = useRef<Map<string, Set<string>> | null>(null)
  const { activeTab, openFileViewer } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const scrollRef = useRef<HTMLDivElement>(null)
  const savedScrollRef = useRef<number | null>(null)

  const activeRepo = useMemo(
    () => (activeTab ? getRepoByName(activeTab) : null),
    [activeTab, getRepoByName]
  )

  const activeRepoPath = activeRepo?.path

  const [contextMenu, setContextMenu] = useState<{
    items: ContextMenuItem[]
    x: number
    y: number
  } | null>(null)

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileTreeNode) => {
    const items: ContextMenuItem[] = []

    if (node.type === 'file' && activeRepoPath) {
      items.push({
        label: 'Delete',
        icon: <Trash2 size={14} />,
        onClick: async () => {
          closeContextMenu()
          try {
            await window.api.deleteFile(activeRepoPath, node.path)
            if (scrollRef.current) {
              savedScrollRef.current = scrollRef.current.scrollTop
            }
            const tree = await window.api.getFileTree(activeRepoPath)
            setTreeCache(prev => new Map(prev).set(activeRepoPath, tree as FileTreeNode[]))
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
        closeContextMenu()
      }
    })

    if (activeRepoPath) {
      items.push({
        label: window.api.platform === 'darwin' ? 'Reveal in Finder'
              : window.api.platform === 'win32' ? 'Reveal in File Explorer'
              : 'Reveal in File Manager',
        icon: <FolderOpen size={14} />,
        onClick: () => {
          window.api.revealInFileManager(activeRepoPath, node.path)
          closeContextMenu()
        }
      })
    }

    setContextMenu({ items, x: e.clientX, y: e.clientY })
  }, [activeRepoPath, closeContextMenu])

  // Derived: expanded paths for the active repo
  const expandedPaths = useMemo(
    () => (activeRepoPath ? expandedMap.get(activeRepoPath) ?? new Set<string>() : new Set<string>()),
    [activeRepoPath, expandedMap]
  )

  const handleToggle = useCallback((path: string) => {
    if (!activeRepoPath) return
    setExpandedMap(prev => {
      const next = new Map(prev)
      const paths = new Set(prev.get(activeRepoPath))
      if (paths.has(path)) {
        paths.delete(path)
      } else {
        paths.add(path)
      }
      next.set(activeRepoPath, paths)
      return next
    })
  }, [activeRepoPath])

  const handleFileClick = useCallback(async (filePath: string) => {
    if (!activeRepoPath) return
    try {
      const content = await window.api.readFile(activeRepoPath, filePath)
      openFileViewer({
        isOpen: true,
        mode: 'view',
        content,
        filePath,
        repoPath: activeRepoPath,
      })
    } catch (error) {
      console.error('Failed to read file:', error)
    }
  }, [activeRepoPath, openFileViewer])

  // Auto-expand root folders on first load for a repo
  const initRootExpansion = useCallback((tree: FileTreeNode[], repoPath: string) => {
    setExpandedMap(prev => {
      if (prev.has(repoPath)) return prev
      const rootFolders = tree.filter(n => n.type === 'folder').map(n => n.path)
      const next = new Map(prev)
      next.set(repoPath, new Set(rootFolders))
      return next
    })
  }, [])

  // Stale-while-revalidate: re-fetch on watcher events without clearing old tree
  useEffect(() => {
    const cleanup = window.api.onFileTreeChanged((changedRepoPath: string) => {
      if (scrollRef.current) {
        savedScrollRef.current = scrollRef.current.scrollTop
      }
      window.api.getFileTree(changedRepoPath).then((tree) => {
        setTreeCache(prev => new Map(prev).set(changedRepoPath, tree as FileTreeNode[]))
      }).catch((error) => {
        console.error('Failed to reload file tree:', error)
      })
    })
    return cleanup
  }, [])

  // Restore scroll position after tree data updates
  useLayoutEffect(() => {
    if (savedScrollRef.current !== null && scrollRef.current) {
      scrollRef.current.scrollTop = savedScrollRef.current
      savedScrollRef.current = null
    }
  })

  // Watch/unwatch active repo file tree
  useEffect(() => {
    if (!activeRepoPath) return
    window.api.watchFileTree(activeRepoPath)
    return () => { window.api.unwatchFileTree(activeRepoPath) }
  }, [activeRepoPath])

  // Initial tree fetch (only when no cache exists)
  useEffect(() => {
    if (!activeRepoPath) return
    if (treeCache.has(activeRepoPath)) return

    const fetchTree = async () => {
      setLoading(true)
      try {
        const tree = await window.api.getFileTree(activeRepoPath)
        const nodes = tree as FileTreeNode[]
        setTreeCache(prev => new Map(prev).set(activeRepoPath, nodes))
        initRootExpansion(nodes, activeRepoPath)
      } catch (error) {
        console.error('Failed to fetch file tree:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTree()
  }, [activeRepoPath, treeCache, initRootExpansion])

  const fileTree = useMemo(
    () => (activeRepoPath ? treeCache.get(activeRepoPath) ?? [] : []),
    [activeRepoPath, treeCache]
  )

  const filteredFileTree = useMemo(() => {
    if (!filterText.trim()) return fileTree
    return filterTree(fileTree, filterText.trim())
  }, [fileTree, filterText])

  // Auto-expand all dirs when filtering
  useEffect(() => {
    if (!activeRepoPath) return
    if (filterText.trim()) {
      // Save expand state on first filter keystroke
      if (!savedExpandedRef.current) {
        setExpandedMap(current => {
          savedExpandedRef.current = new Map(
            Array.from(current.entries()).map(([k, v]) => [k, new Set(v)])
          )
          return current
        })
      }
      const allDirs = collectAllDirPaths(filteredFileTree)
      setExpandedMap(prev => {
        const next = new Map(prev)
        next.set(activeRepoPath, allDirs)
        return next
      })
    } else if (savedExpandedRef.current) {
      // Restore saved expand state
      setExpandedMap(savedExpandedRef.current)
      savedExpandedRef.current = null
    }
  }, [filterText, activeRepoPath, filteredFileTree])

  // Reset search when switching repos
  useEffect(() => {
    setIsSearchOpen(false)
    setFilterText('')
    savedExpandedRef.current = null
  }, [activeRepoPath])

  const handleSearchOpen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsSearchOpen(true)
  }, [])

  const handleSearchClose = useCallback(() => {
    setFilterText('')
    setIsSearchOpen(false)
  }, [])

  const handleSearchBlur = useCallback(() => {
    if (!filterText.trim()) {
      handleSearchClose()
    }
  }, [filterText, handleSearchClose])

  return (
    <div className="sidebar-section file-tree-section">
      <div className="file-tree-header">
        <div className="file-tree-header__content">
          <button
            className={`file-tree-header__title ${isSearchOpen ? 'file-tree-header__title--hidden' : ''}`}
            onClick={() => setExpanded(!expanded)}
          >
            <FolderTree size={16} />
            <h3>Project Context</h3>
          </button>

          {isSearchOpen && (
            <div className="file-tree-header__search">
              <SearchInput
                value={filterText}
                onChange={setFilterText}
                onClose={handleSearchClose}
                onBlur={handleSearchBlur}
                placeholder="Filter files..."
                autoFocus
              />
            </div>
          )}
        </div>

        {!isSearchOpen && (
          <button
            className="file-tree-header__action"
            onClick={handleSearchOpen}
            title="Filter files"
          >
            <Search size={14} />
          </button>
        )}

        <button
          className="file-tree-header__action"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="file-tree" ref={scrollRef}>
          {!activeRepo ? (
            <p className="tree-empty">No repo selected</p>
          ) : loading ? (
            <p className="tree-empty">Loading...</p>
          ) : filteredFileTree.length === 0 && filterText.trim() ? (
            <p className="tree-empty">No matching files</p>
          ) : filteredFileTree.length === 0 ? (
            <p className="tree-empty">Empty directory</p>
          ) : (
            <div>
              {filteredFileTree.map(node => (
                <TreeNode
                  key={node.path}
                  node={node}
                  depth={0}
                  expandedPaths={expandedPaths}
                  onToggle={handleToggle}
                  onContextMenu={handleContextMenu}
                  onFileClick={handleFileClick}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          items={contextMenu.items}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}
