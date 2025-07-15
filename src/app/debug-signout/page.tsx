'use client'

import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function DebugSignOut() {
  const { data: session, status } = useSession()
  
  const testDirectSignOut = () => {
    console.log('Direct sign out clicked')
    window.location.href = '/api/auth/custom-signout'
  }
  
  const testFetchSignOut = async () => {
    console.log('Fetch sign out clicked')
    try {
      const response = await fetch('/api/auth/custom-signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      
      if (response.ok) {
        console.log('Sign out successful, redirecting...')
        setTimeout(() => {
          window.location.href = '/'
        }, 100)
      }
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Debug Sign Out</h1>
      
      <div className="mb-4">
        <p>Session Status: {status}</p>
        <p>User: {session?.user?.email || 'Not logged in'}</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <Button onClick={testDirectSignOut} className="mr-4">
            Direct Sign Out (GET)
          </Button>
          <span className="text-sm text-gray-500">Uses window.location.href</span>
        </div>
        
        <div>
          <Button onClick={testFetchSignOut} className="mr-4">
            Fetch Sign Out (POST)
          </Button>
          <span className="text-sm text-gray-500">Uses fetch API</span>
        </div>
        
        <div>
          <a href="/api/auth/custom-signout" className="text-blue-500 underline">
            Direct Link to Sign Out
          </a>
        </div>
      </div>
    </div>
  )
}