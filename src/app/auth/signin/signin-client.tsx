'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import { Button } from '@/components/ui/button'

export function SignInClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const errorParam = searchParams.get('error')

  useEffect(() => {
    if (errorParam) {
      setError(errorParam)
    }
  }, [errorParam])

  useEffect(() => {
    // Check if already signed in - only run once on mount
    let mounted = true;

    getSession().then((session) => {
      if (mounted && session) {
        router.push(callbackUrl)
      }
    }).catch((error) => {
      console.error('Session check error:', error);
    })

    return () => {
      mounted = false;
    }
  }, []) // Empty dependency array - only run once!

  const handleSignIn = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await signIn('azure-ad', {
        callbackUrl,
        redirect: false,
      })
      
      if (result?.error) {
        setError(result.error)
      } else if (result?.url) {
        router.push(result.url)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'OAuthCallback':
        return 'Authentication failed. Please check your Azure AD configuration and try again.'
      case 'Signin':
        return 'Sign in failed. Please try again.'
      case 'OAuthSignin':
        return 'Error starting OAuth sign in. Please try again.'
      case 'OAuthCreateAccount':
        return 'Could not create account. Please contact your administrator.'
      case 'EmailCreateAccount':
        return 'Could not create account. Please contact your administrator.'
      case 'Callback':
        return 'Authentication callback error. Please try again.'
      case 'OAuthAccountNotLinked':
        return 'Account not linked. Please use the same account you used to sign up.'
      case 'EmailSignin':
        return 'Email sign in error. Please try again.'
      case 'CredentialsSignin':
        return 'Invalid credentials. Please check your login details.'
      case 'SessionRequired':
        return 'Please sign in to access this page.'
      default:
        return `Authentication error: ${error}`
    }
  }

  return (
    <GlassmorphismContainer className="max-w-md w-full p-8 text-center">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 font-raleway">
          Welcome to Flyadeal Intranet
        </h1>
        <p className="text-white/70">
          Sign in with your Microsoft account to access the portal
        </p>
        
        {error && (
          <div className="mt-4 p-3 bg-flyadeal-red/20 border border-flyadeal-red/40 rounded-lg">
            <p className="text-flyadeal-red text-sm">
              {getErrorMessage(error)}
            </p>
          </div>
        )}
      </div>

      <Button 
        onClick={handleSignIn}
        disabled={loading}
        className="w-full bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90 font-semibold disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign in with Microsoft'}
      </Button>

      <div className="mt-6 text-xs text-white/50">
        <p>Callback URL: {callbackUrl}</p>
        <p>Environment: {process.env.NODE_ENV}</p>
      </div>
    </GlassmorphismContainer>
  )
}