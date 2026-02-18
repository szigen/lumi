import { useRef, useEffect, type KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'
import './SearchInput.css'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onClose?: () => void
  onBlur?: () => void
  autoFocus?: boolean
  className?: string
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  onClose,
  onBlur,
  autoFocus = false,
  className = '',
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
    }
  }, [autoFocus])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onChange('')
      onClose?.()
    }
  }

  const handleClear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  return (
    <div className={`search-input ${className}`}>
      <Search size={14} className="search-input__icon" />
      <input
        ref={inputRef}
        type="text"
        className="search-input__field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
      />
      {value && (
        <button className="search-input__clear" onClick={handleClear}>
          <X size={14} />
        </button>
      )}
    </div>
  )
}
