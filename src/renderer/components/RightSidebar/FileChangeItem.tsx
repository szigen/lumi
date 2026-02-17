import { useState } from 'react'
import { FolderOpen } from 'lucide-react'
import type { FileChange } from '../../../shared/types'
import ContextMenu from '../LeftSidebar/ContextMenu'

interface FileChangeItemProps {
  file: FileChange
  isSelected: boolean
  repoPath: string
  onToggle: () => void
}

const STATUS_CONFIG: Record<FileChange['status'], { label: string; className: string }> = {
  modified: { label: 'M', className: 'file-change__status--modified' },
  added: { label: 'A', className: 'file-change__status--added' },
  deleted: { label: 'D', className: 'file-change__status--deleted' },
  renamed: { label: 'R', className: 'file-change__status--renamed' },
  untracked: { label: 'U', className: 'file-change__status--untracked' }
}

export default function FileChangeItem({ file, isSelected, repoPath, onToggle }: FileChangeItemProps) {
  const config = STATUS_CONFIG[file.status]
  const fileName = file.path.split('/').pop() || file.path
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  return (
    <>
      <button className="file-change" onClick={onToggle} onContextMenu={handleContextMenu}>
        <input
          type="checkbox"
          className="file-change__checkbox"
          checked={isSelected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
        />
        <span className={`file-change__status ${config.className}`}>
          {config.label}
        </span>
        <span className="file-change__name" title={file.path}>
          {fileName}
        </span>
      </button>
      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: 'Reveal in File Manager',
              icon: <FolderOpen size={14} />,
              onClick: () => window.api.revealInFileManager(repoPath, file.path),
            },
          ]}
        />
      )}
    </>
  )
}
