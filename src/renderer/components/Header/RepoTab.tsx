import { X, Folder } from 'lucide-react'

interface RepoTabProps {
  name: string
  isActive: boolean
  onClick: () => void
  onClose: () => void
}

export default function RepoTab({ name, isActive, onClick, onClose }: RepoTabProps) {
  return (
    <div 
      className={`repo-tab ${isActive ? 'repo-tab--active' : ''}`}
      onClick={onClick}
    >
      <Folder size={14} />
      <span className="repo-tab__name">{name}</span>
      <button
        className="repo-tab__close"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <X size={12} />
      </button>
    </div>
  )
}
