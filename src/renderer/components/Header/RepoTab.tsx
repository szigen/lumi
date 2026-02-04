import { X, Folder } from 'lucide-react'

interface RepoTabProps {
  name: string
  isActive: boolean
  onClick: () => void
  onClose: () => void
}

export default function RepoTab({ name, isActive, onClick, onClose }: RepoTabProps) {
  return (
    <div onClick={onClick}>
      <Folder size={14} />
      <span>{name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <X size={12} />
      </button>
      {isActive && <span>(active)</span>}
    </div>
  )
}
