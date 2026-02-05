import type { FileChange } from '../../../shared/types'

interface FileChangeItemProps {
  file: FileChange
  isSelected: boolean
  onToggle: () => void
}

const STATUS_CONFIG: Record<FileChange['status'], { label: string; className: string }> = {
  modified: { label: 'M', className: 'file-change__status--modified' },
  added: { label: 'A', className: 'file-change__status--added' },
  deleted: { label: 'D', className: 'file-change__status--deleted' },
  renamed: { label: 'R', className: 'file-change__status--renamed' },
  untracked: { label: 'U', className: 'file-change__status--untracked' }
}

export default function FileChangeItem({ file, isSelected, onToggle }: FileChangeItemProps) {
  const config = STATUS_CONFIG[file.status]
  const fileName = file.path.split('/').pop() || file.path

  return (
    <button className="file-change" onClick={onToggle}>
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
  )
}
