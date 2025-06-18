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
    light: "glass-morphism",
    dark: "glass-morphism-dark", 
    colored: "glass-morphism"
  }

  return (
    <div className={cn(
      variants[variant],
      className
    )}>
      {children}
    </div>
  )
}
