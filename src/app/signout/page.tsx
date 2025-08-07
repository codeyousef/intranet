'use client'

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'

export default function SignOutPage() {
  useEffect(() => {
    const performSignOut = async () => {
      try {
        // Clear sessionStorage and localStorage
        if (typeof window !== 'undefined') {
          sessionStorage.clear()
          localStorage.clear()
        }
        
        // Sign out from NextAuth
        await signOut({ 
          redirect: false,
          callbackUrl: '/' 
        })
      } catch (error) {
        // Handle error silently
      }
      
      // Force redirect after a short delay
      setTimeout(() => {
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