'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/lib/theme-context'
// Import the fetch interceptor to handle non-JSON responses
// Using the safe version that only runs in browser environments
import '@/lib/fetch-interceptor-safe'
// Import the chunk error handler to handle chunk loading errors
import '@/lib/chunk-error-handler'
// Import the chunk preloader to preload critical chunks
import '@/lib/chunk-preloader'

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
