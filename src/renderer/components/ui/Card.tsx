import { motion, HTMLMotionProps } from 'framer-motion'
import { forwardRef, ReactNode } from 'react'

type CardVariant = 'default' | 'elevated' | 'glass' | 'interactive'

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: CardVariant
  children: ReactNode
  noPadding?: boolean
}

const variantStyles: Record<CardVariant, string> = {
  default: `
    bg-bg-secondary
    border border-border-subtle
  `,
  elevated: `
    bg-bg-tertiary
    border border-border-default
    shadow-elevated
  `,
  glass: `
    bg-surface-glass
    backdrop-blur-glass
    border border-border-subtle
  `,
  interactive: `
    bg-bg-secondary
    border border-border-subtle
    cursor-pointer
    hover:bg-bg-tertiary
    hover:border-accent/30
    hover:shadow-glow-accent
  `,
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { variant = 'default', children, noPadding, className = '', ...props },
    ref
  ) => {
    const isInteractive = variant === 'interactive'

    return (
      <motion.div
        ref={ref}
        whileHover={isInteractive ? { scale: 1.01 } : undefined}
        whileTap={isInteractive ? { scale: 0.99 } : undefined}
        transition={{ duration: 0.15 }}
        className={`
          rounded-xl
          transition-all duration-normal ease-out
          ${variantStyles[variant]}
          ${noPadding ? '' : 'p-4'}
          ${className}
        `}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

export default Card
