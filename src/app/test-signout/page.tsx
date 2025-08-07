'use client'

import { Button } from '@/components/ui/button'

export default function TestSignOut() {
  const testSignOut = async () => {
    try {
      const response = await fetch('/api/auth/custom-signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        window.location.href = '/'
      }
    } catch (error) {
      // Handle error silently or show user-friendly message
    }
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Test Sign Out</h1>
      <Button onClick={testSignOut}>
        Test Custom Sign Out
      </Button>
      
      <div className="mt-4">
        <a href="/api/auth/custom-signout" className="text-blue-500 underline">
          Direct GET Sign Out
        </a>
      </div>
    </div>
  )
}