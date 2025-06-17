import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface GlassmorphismContainerProps {
  children: ReactNode
  className?: string
  variant?: 'light' | 'dark' | 'colored'
}

export function GlassmorphismContainer({ 
  children, 
  className, 
  variant = 'light' 
}: GlassmorphismContainerProps) {
  const variants = {
    light: "bg-white/10 border-white/20",
    dark: "bg-black/10 border-white/10", 
    colored: "bg-flyadeal-purple/10 border-flyadeal-purple/20"
  }

  return (
    <div className={cn(
      "backdrop-blur-md rounded-xl border shadow-lg",
      variants[variant],
      className
    )}>
      {children}
    </div>
  )
}