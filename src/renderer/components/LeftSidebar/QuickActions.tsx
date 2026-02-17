import { useState, useEffect, useCallback } from 'react'
import {
  Zap, Terminal, TestTube, Package, GitBranch, FileEdit, Plus,
  Clock, Trash2, RotateCcw, Pencil
} from 'lucide-react'
import type { Action } from '../../../shared/action-types'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import ContextMenu from './ContextMenu'

const ICON_MAP: Record<string, React.ReactNode> = {
  Terminal: <Terminal size={16} />,
  TestTube: <TestTube size={16} />,
  Package: <Package size={16} />,
  GitBranch: <GitBranch size={16} />,
  FileEdit: <FileEdit size={16} />,
  Plus: <Plus size={16} />,
  Zap: <Zap size={16} />,
}

function formatTimestamp(filename: string): string {
  // filename: 2026-02-11T14-30-00.yaml → parse to date
  const name = filename.replace('.yaml', '')
  const isoStr = name.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3') + 'Z'
  const date = new Date(isoStr)
  if (isNaN(date.getTime())) return name

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function QuickActions() {
  const syncFromMain = useTerminalStore((s) => s.syncFromMain)
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()
  const [actions, setActions] = useState<Action[]>([])
  const [defaultIds, setDefaultIds] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{
    action: Action
    position: { x: number; y: number }
  } | null>(null)
  const [historyPanel, setHistoryPanel] = useState<{
    actionId: string
    entries: string[]
    position: { x: number; y: number }
  } | null>(null)

  const activeRepo = activeTab ? getRepoByName(activeTab) : null

  useEffect(() => {
    window.api.getDefaultActionIds().then((ids) => setDefaultIds(new Set(ids)))
  }, [])

  useEffect(() => {
    let cancelled = false
    window.api.getActions(activeRepo?.path).then((list) => {
      if (!cancelled) setActions(list as Action[])
    })
    return () => { cancelled = true }
  }, [activeRepo?.path])

  // Listen for action file changes
  useEffect(() => {
    const cleanup = window.api.onActionsChanged(() => {
      window.api.getActions(activeRepo?.path).then((list) => {
        setActions(list as Action[])
      })
    })
    return cleanup
  }, [activeRepo?.path])

  // Load project actions when active repo changes
  useEffect(() => {
    if (activeRepo?.path) {
      window.api.loadProjectActions(activeRepo.path)
    }
  }, [activeRepo?.path])

  const executeAndTrack = useCallback(async (
    apiCall: () => Promise<{ id: string; name: string; isNew: boolean } | null>
  ) => {
    if (!activeRepo) return
    const result = await apiCall()
    if (result) {
      await syncFromMain()
    }
  }, [activeRepo, syncFromMain])

  const handleCreateAction = () =>
    executeAndTrack(() => window.api.createNewAction(activeRepo!.path))

  const handleAction = (action: Action) =>
    executeAndTrack(() => window.api.executeAction(action.id, activeRepo!.path))

  const handleContextMenu = useCallback((e: React.MouseEvent, action: Action) => {
    e.preventDefault()
    setHistoryPanel(null)
    setContextMenu({ action, position: { x: e.clientX, y: e.clientY } })
  }, [])

  const handleShowHistory = useCallback(async (action: Action, position: { x: number; y: number }) => {
    setContextMenu(null)
    const entries = await window.api.getActionHistory(action.id)
    if (entries.length === 0) return
    setHistoryPanel({ actionId: action.id, entries, position })
  }, [])

  const handleRestore = useCallback(async (actionId: string, timestamp: string) => {
    await window.api.restoreAction(actionId, timestamp)
    setHistoryPanel(null)
  }, [])

  const handleDelete = useCallback(async (action: Action) => {
    setContextMenu(null)
    await window.api.deleteAction(action.id, action.scope, activeRepo?.path)
  }, [activeRepo?.path])

  const handleResetDefault = useCallback(async (action: Action) => {
    setContextMenu(null)
    // Deleting a default action triggers seedDefaults on next reload via watcher
    await window.api.deleteAction(action.id, action.scope, activeRepo?.path)
  }, [activeRepo?.path])

  const handleEdit = useCallback(async (action: Action) => {
    setContextMenu(null)
    await executeAndTrack(() => window.api.editAction(action.id, action.scope, activeRepo?.path))
  }, [executeAndTrack, activeRepo?.path])

  const userActions = actions.filter((a) => a.scope === 'user')
  const projectActions = actions.filter((a) => a.scope === 'project')

  const renderActionButton = (action: Action) => (
    <button
      key={action.id}
      className="action-btn"
      onClick={() => handleAction(action)}
      onContextMenu={(e) => handleContextMenu(e, action)}
      disabled={!activeRepo}
      title={action.label}
    >
      {ICON_MAP[action.icon] || <Zap size={16} />}
      <span>{action.label}</span>
    </button>
  )

  return (
    <div className="sidebar-section">
      <div className="section-header">
        <Zap size={16} />
        <h3>Quick Actions</h3>
        <button
          className="section-header__action"
          onClick={handleCreateAction}
          disabled={!activeRepo}
          title="Create new action"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="quick-actions">
        {userActions.map(renderActionButton)}
      </div>

      {projectActions.length > 0 && (
        <>
          <div className="action-divider" />
          <div className="quick-actions">
            {projectActions.map(renderActionButton)}
          </div>
        </>
      )}

      {contextMenu && (
        <ContextMenu
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: 'Edit',
              icon: <Pencil size={14} />,
              onClick: () => handleEdit(contextMenu.action)
            },
            {
              label: 'Delete',
              icon: <Trash2 size={14} />,
              onClick: () => handleDelete(contextMenu.action)
            },
            {
              label: 'History',
              icon: <Clock size={14} />,
              onClick: () => handleShowHistory(contextMenu.action, contextMenu.position)
            },
            ...(defaultIds.has(contextMenu.action.id) && contextMenu.action.modified_at
              ? [{
                  label: 'Reset to Default',
                  icon: <RotateCcw size={14} />,
                  onClick: () => handleResetDefault(contextMenu.action)
                }]
              : []
            )
          ]}
        />
      )}

      {historyPanel && (
        <ContextMenu
          position={historyPanel.position}
          onClose={() => setHistoryPanel(null)}
          items={historyPanel.entries.map((entry) => ({
            label: formatTimestamp(entry),
            icon: <Clock size={14} />,
            onClick: () => handleRestore(historyPanel.actionId, entry)
          }))}
        />
      )}
    </div>
  )
}
