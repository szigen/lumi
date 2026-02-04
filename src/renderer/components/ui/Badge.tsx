import { ReactNode } from 'react'

interface BadgeProps {
  variant?: string
  children: ReactNode
}

export default function Badge({ children }: BadgeProps) {
  return <span>[{children}]</span>
}
