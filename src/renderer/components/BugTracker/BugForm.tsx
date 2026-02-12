import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface BugFormProps {
  onSubmit: (title: string, description: string) => void
  onCancel: () => void
}

export default function BugForm({ onSubmit, onCancel }: BugFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit(title.trim(), description.trim())
    setTitle('')
    setDescription('')
  }

  return (
    <form className="bug-form" onSubmit={handleSubmit}>
      <input
        className="bug-form__input"
        placeholder="Bug title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <textarea
        className="bug-form__textarea"
        placeholder="Description (optional)..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />
      <div className="bug-form__actions">
        <button type="submit" className="bug-form__btn bug-form__btn--submit" disabled={!title.trim()}>
          <Plus size={14} /> Add Bug
        </button>
        <button type="button" className="bug-form__btn bug-form__btn--cancel" onClick={onCancel}>
          <X size={14} /> Cancel
        </button>
      </div>
    </form>
  )
}
