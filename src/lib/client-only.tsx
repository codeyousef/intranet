'use client'

import { useEffect, useState, ReactNode } from 'react'

interface ClientOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

// This component ensures its children are only rendered on the client side
// It prevents hydration mismatches by not rendering anything during SSR
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Return fallback (or null) during SSR and initial client render
  // Only render children after the component has mounted on the client
  return isClient ? children : fallback
}