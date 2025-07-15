'use client'

import { Button } from '@/components/ui/button'

export default function TestSignOut() {
  const testSignOut = async () => {
    console.log('Test sign out clicked')
    
    try {
      const response = await fetch('/api/auth/custom-signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Response:', response)
      const data = await response.json()
      console.log('Data:', data)
      
      if (response.ok) {
        console.log('Sign out successful, redirecting...')
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Sign out error:', error)
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