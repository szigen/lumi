interface LogoProps {
  size?: number
  className?: string
  animated?: boolean
}

export default function Logo({ size = 24, className = '', animated = false }: LogoProps) {
  const animatedClass = animated ? 'logo--animated' : ''
  const uid = `lumi-${size}`
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
        <linearGradient id={`${uid}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id={`${uid}-grad2`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 8 tentacles radiating from center — each ends with a terminal node */}
      <g filter={`url(#${uid}-glow)`}>
        {/* Tentacle paths — organic curves from head to terminal nodes */}
        <path d="M16 17 Q17 21, 21 24" stroke="#8b5cf6" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M16 17 Q15 21, 11 24" stroke="#8b5cf6" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M16 17 Q20 19, 25 20" stroke="#8b5cf6" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M16 17 Q12 19, 7 20" stroke="#8b5cf6" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M16 17 Q21 18, 26 16" stroke="#8b5cf6" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />
        <path d="M16 17 Q11 18, 6 16" stroke="#8b5cf6" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />
        <path d="M16 17 Q19 21, 17 26" stroke="#8b5cf6" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />
        <path d="M16 17 Q13 21, 15 26" stroke="#8b5cf6" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />

        {/* Terminal nodes at tentacle tips */}
        <circle cx="21" cy="24" r="1.5" fill={`url(#${uid}-grad)`} />
        <circle cx="11" cy="24" r="1.5" fill={`url(#${uid}-grad)`} />
        <circle cx="25" cy="20" r="1.5" fill={`url(#${uid}-grad)`} />
        <circle cx="7" cy="20" r="1.5" fill={`url(#${uid}-grad)`} />
        <circle cx="26" cy="16" r="1.5" fill={`url(#${uid}-grad)`} />
        <circle cx="6" cy="16" r="1.5" fill={`url(#${uid}-grad)`} />
        <circle cx="17" cy="26" r="1.5" fill={`url(#${uid}-grad)`} />
        <circle cx="15" cy="26" r="1.5" fill={`url(#${uid}-grad)`} />
      </g>

      {/* Octopus head — rounded dome */}
      <ellipse cx="16" cy="12" rx="7" ry="7.5" fill={`url(#${uid}-grad)`} filter={`url(#${uid}-glow)`} />

      {/* Eyes */}
      <ellipse cx="13" cy="12.5" rx="1.8" ry="2" fill="#1a1025" />
      <ellipse cx="19" cy="12.5" rx="1.8" ry="2" fill="#1a1025" />
      <circle cx="13.5" cy="11.8" r="0.7" fill="#e0d4ff" />
      <circle cx="19.5" cy="11.8" r="0.7" fill="#e0d4ff" />
    </svg>
  )
}
