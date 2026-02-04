import { forwardRef, ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  variant?: 'primary' | 'ghost'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, leftIcon, rightIcon, disabled, variant = 'primary', className = '', ...props }, ref) => {
    const variantClass = variant === 'ghost' ? 'btn--ghost' : 'btn--primary'
    return (
      <button 
        ref={ref} 
        disabled={disabled} 
        className={`btn ${variantClass} ${className}`}
        {...props}
      >
        {leftIcon}
        {children}
        {rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
