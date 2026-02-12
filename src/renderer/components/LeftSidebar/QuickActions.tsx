import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Terminal, TestTube, Package, GitBranch, FileEdit, Plus,
  Pencil, Trash2, AlertTriangle
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

export default function QuickActions() {
  const { addTerminal } = useTerminalStore()
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()
  const [actions, setActions] = useState<Action[]>([])
  const [contextMenu, setContextMenu] = useState<{ action: Action; position: { x: number; y: number } } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Action | null>(null)

  const activeRepo = activeTab ? getRepoByName(activeTab) : null

  useEffect(() => {
    let cancelled = false
    window.api.getActions(activeRepo?.path).then((list) => {
      if (!cancelled) setActions(list as Action[])
    })
    return () => { cancelled = true }
  }, [activeRepo?.path])

  useEffect(() => {
    const cleanup = window.api.onActionsChanged(() => {
      window.api.getActions(activeRepo?.path).then((list) => {
        setActions(list as Action[])
      })
    })
    return cleanup
  }, [activeRepo?.path])

  useEffect(() => {
    if (activeRepo?.path) {
      window.api.loadProjectActions(activeRepo.path)
    }
  }, [activeRepo?.path])

  const executeAndTrack = async (
    apiCall: () => Promise<{ id: string; name: string; isNew: boolean } | null>,
    task?: string
  ) => {
    if (!activeRepo) return
    const result = await apiCall()
    if (result) {
      addTerminal({
        id: result.id,
        name: result.name,
        repoPath: activeRepo.path,
        status: 'running',
        isNew: result.isNew,
        task,
        createdAt: new Date()
      })
    }
  }

  const handleCreateAction = () =>
    executeAndTrack(() => window.api.createNewAction(activeRepo!.path), 'Create Action')

  const handleAction = (action: Action) =>
    executeAndTrack(() => window.api.executeAction(action.id, activeRepo!.path), action.label)

  const handleContextMenu = useCallback((e: React.MouseEvent, action: Action) => {
    e.preventDefault()
    setContextMenu({ action, position: { x: e.clientX, y: e.clientY } })
  }, [])

  const handleEdit = useCallback((action: Action) => {
    window.api.openActionFile(action.id, action.scope, activeRepo?.path)
  }, [activeRepo?.path])

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return
    await window.api.deleteAction(deleteConfirm.id, deleteConfirm.scope, activeRepo?.path)
    setDeleteConfirm(null)
  }, [deleteConfirm, activeRepo?.path])

  useEffect(() => {
    if (!deleteConfirm) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDeleteConfirm(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [deleteConfirm])

  const userActions = actions.filter((a) => a.scope === 'user')
  const projectActions = actions.filter((a) => a.scope === 'project')

  const renderActionButton = (action: Action) => (
    <button
      key={action.id}
      className="action-btn"
      onClick={() => handleAction(action)}
      onContextMenu={(e) => handleContextMenu(e, action)}
      disabled={!activeRepo}
      title={action.scope === 'project' ? `${action.label} (project)` : action.label}
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
          items={[
            {
              label: 'Edit',
              icon: <Pencil size={14} />,
              onClick: () => handleEdit(contextMenu.action)
            },
            {
              label: 'Delete',
              icon: <Trash2 size={14} />,
              onClick: () => setDeleteConfirm(contextMenu.action)
            }
          ]}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
        />
      )}

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="settings-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              className="quit-dialog"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="quit-dialog__icon">
                <AlertTriangle size={32} />
              </div>
              <h2 className="quit-dialog__title">Delete Action?</h2>
              <p className="quit-dialog__message">
                <strong>{deleteConfirm.label}</strong> will be permanently deleted.
              </p>
              <div className="quit-dialog__footer">
                <button className="quit-dialog__cancel-btn" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button className="quit-dialog__quit-btn" onClick={handleDelete} autoFocus>
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
