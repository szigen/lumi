import { motion, HTMLMotionProps } from 'framer-motion'
import { forwardRef, ReactNode } from 'react'

type IconButtonVariant = 'default' | 'ghost' | 'accent'
type IconButtonSize = 'sm' | 'md' | 'lg'

interface IconButtonProps extends HTMLMotionProps<'button'> {
  variant?: IconButtonVariant
  size?: IconButtonSize
  icon: ReactNode
  tooltip?: string
}

const variantStyles: Record<IconButtonVariant, string> = {
  default: `
    bg-bg-tertiary
    text-text-secondary
    border border-border-subtle
    hover:text-text-primary
    hover:bg-bg-elevated
    hover:border-border-default
  `,
  ghost: `
    bg-transparent
    text-text-secondary
    hover:text-text-primary
    hover:bg-surface-hover
  `,
  accent: `
    bg-accent/10
    text-accent
    hover:bg-accent/20
    hover:text-accent-light
  `,
}

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'w-7 h-7',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
}

const iconSizeStyles: Record<IconButtonSize, string> = {
  sm: '[&_svg]:w-3.5 [&_svg]:h-3.5',
  md: '[&_svg]:w-4 [&_svg]:h-4',
  lg: '[&_svg]:w-5 [&_svg]:h-5',
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'ghost',
      size = 'md',
      icon,
      tooltip,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        transition={{ duration: 0.15 }}
        disabled={disabled}
        title={tooltip}
        className={`
          inline-flex items-center justify-center
          rounded-lg
          transition-all duration-fast ease-out
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${iconSizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {icon}
      </motion.button>
    )
  }
)

IconButton.displayName = 'IconButton'

export default IconButton
