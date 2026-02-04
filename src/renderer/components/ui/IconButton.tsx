import { forwardRef, ReactNode, ButtonHTMLAttributes } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  tooltip?: string
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, tooltip, disabled, ...props }, ref) => {
    return (
      <button ref={ref} disabled={disabled} title={tooltip} {...props}>
        {icon}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'

export default IconButton
