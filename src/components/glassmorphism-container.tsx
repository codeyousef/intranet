import { cn } from "@/lib/utils"
import { ReactNode } from "react"
import { useTheme } from "@/lib/theme-context"

interface GlassmorphismContainerProps {
  children: ReactNode
  className?: string
  variant?: 'light' | 'dark' | 'colored'
}

export function GlassmorphismContainer({ 
  children, 
  className, 
  variant: propVariant = undefined 
}: GlassmorphismContainerProps) {
  const { theme } = useTheme()

  // Use the prop variant if provided, otherwise use the theme context
  const variant = propVariant || (theme === 'dark' ? 'dark' : 'light')

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
