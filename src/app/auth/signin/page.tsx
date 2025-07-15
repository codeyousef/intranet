import { Suspense } from 'react'
import { SignInClient } from './signin-client'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="text-white">Loading...</div>
      }>
        <SignInClient />
      </Suspense>
    </div>
  )
}
