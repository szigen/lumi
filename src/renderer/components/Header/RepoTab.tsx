interface RepoTabProps {
  name: string
  isActive: boolean
  onClick: () => void
  onClose: () => void
}

export default function RepoTab({ name, isActive, onClick, onClose }: RepoTabProps) {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-t cursor-pointer
        border border-b-0 border-border-primary
        ${isActive
          ? 'bg-bg-primary text-text-primary'
          : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
        }
      `}
    >
      <span className="text-sm truncate max-w-32">{name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="text-text-secondary hover:text-text-primary text-xs"
      >
        ✕
      </button>
    </div>
  )
}
