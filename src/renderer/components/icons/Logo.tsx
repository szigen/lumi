interface LogoProps {
  size?: number
  className?: string
  animated?: boolean
}

export default function Logo({ size = 24, className = '', animated = false }: LogoProps) {
  const animatedClass = animated ? 'logo--animated' : ''
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`logo ${animatedClass} ${className}`}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer hexagon frame */}
      <path
        d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
        stroke="url(#logoGradient)"
        strokeWidth="1.5"
        fill="none"
        filter="url(#glow)"
      />

      {/* Inner orchestrator nodes */}
      <g filter="url(#glow)">
        {/* Center node */}
        <circle cx="16" cy="16" r="3" fill="url(#logoGradient)" />

        {/* Orbital nodes */}
        <circle cx="16" cy="8" r="2" fill="url(#logoGradient)" opacity="0.8" />
        <circle cx="22.9" cy="12" r="2" fill="url(#logoGradient)" opacity="0.8" />
        <circle cx="22.9" cy="20" r="2" fill="url(#logoGradient)" opacity="0.8" />
        <circle cx="16" cy="24" r="2" fill="url(#logoGradient)" opacity="0.8" />
        <circle cx="9.1" cy="20" r="2" fill="url(#logoGradient)" opacity="0.8" />
        <circle cx="9.1" cy="12" r="2" fill="url(#logoGradient)" opacity="0.8" />

        {/* Connection lines */}
        <line x1="16" y1="16" x2="16" y2="8" stroke="url(#logoGradient)" strokeWidth="1" opacity="0.6" />
        <line x1="16" y1="16" x2="22.9" y2="12" stroke="url(#logoGradient)" strokeWidth="1" opacity="0.6" />
        <line x1="16" y1="16" x2="22.9" y2="20" stroke="url(#logoGradient)" strokeWidth="1" opacity="0.6" />
        <line x1="16" y1="16" x2="16" y2="24" stroke="url(#logoGradient)" strokeWidth="1" opacity="0.6" />
        <line x1="16" y1="16" x2="9.1" y2="20" stroke="url(#logoGradient)" strokeWidth="1" opacity="0.6" />
        <line x1="16" y1="16" x2="9.1" y2="12" stroke="url(#logoGradient)" strokeWidth="1" opacity="0.6" />
      </g>
    </svg>
  )
}
