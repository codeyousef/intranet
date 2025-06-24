'use client'

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'

export default function SignOutPage() {
  useEffect(() => {
    const performSignOut = async () => {
      console.log('[SignOut Page] Starting sign out process...')
      
      try {
        // Clear sessionStorage and localStorage
        if (typeof window !== 'undefined') {
          sessionStorage.clear()
          localStorage.clear()
          console.log('[SignOut Page] Cleared browser storage')
        }
        
        // Sign out from NextAuth
        await signOut({ 
          redirect: false,
          callbackUrl: '/' 
        })
        console.log('[SignOut Page] NextAuth signOut complete')
      } catch (error) {
        console.error('[SignOut Page] Error during signOut:', error)
      }
      
      // Force redirect after a short delay
      setTimeout(() => {
        console.log('[SignOut Page] Redirecting to home...')
        window.location.href = '/'
      }, 500)
    }
    
    performSignOut()
  }, [])
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flyadeal-yellow mx-auto mb-4"></div>
        <p className="text-gray-600">Signing out...</p>
      </div>
    </div>
  )
}