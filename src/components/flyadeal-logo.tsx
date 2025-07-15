interface FlyadealLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function FlyadealLogo({ className = "", size = 'md' }: FlyadealLogoProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16'
  }

  return (
    <div className={`${sizes[size]} ${className} flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="flyadeal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#522D6D" />
            <stop offset="50%" stopColor="#1877B8" />
            <stop offset="100%" stopColor="#2CB3E2" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#flyadeal-gradient)" />
        <path 
          d="M30 40 L50 25 L70 40 L70 55 L50 70 L30 55 Z" 
          fill="#D7D800" 
          opacity="0.9"
        />
        <text 
          x="50" 
          y="55" 
          textAnchor="middle" 
          fill="#522D6D" 
          fontSize="12" 
          fontWeight="bold"
          fontFamily="Raleway"
        >
          FA
        </text>
      </svg>
    </div>
  )
}