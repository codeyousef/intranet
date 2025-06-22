'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/lib/theme-context'
// Import the fetch interceptor to handle non-JSON responses
import '@/lib/fetch-interceptor'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider 
      // Add error handling for session fetching
      onError={(error) => {
        console.error('NextAuth session error:', error)
      }}
      refetchInterval={0} // Disable automatic refetching to prevent repeated errors
      refetchOnWindowFocus={false} // Disable refetch on window focus
    >
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
}
