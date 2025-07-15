import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('[Force Signout] Processing signout request')
  
  // Create response that redirects to home
  const response = NextResponse.redirect(new URL('/', request.url))
  
  // List of all possible auth cookie names
  const authCookies = [
    'next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url',
    'next-auth.pkce.code_verifier',
    '__Secure-next-auth.session-token',
    '__Secure-next-auth.csrf-token',
    '__Secure-next-auth.callback-url'
  ]
  
  // Clear each cookie with proper settings
  authCookies.forEach(cookieName => {
    try {
      // Delete cookie by setting it to empty with maxAge 0
      response.cookies.set(cookieName, '', {
        maxAge: 0,
        expires: new Date(0),
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        secure: cookieName.startsWith('__Secure-')
      })
      console.log(`[Force Signout] Cleared cookie: ${cookieName}`)
    } catch (error) {
      console.log(`[Force Signout] Failed to clear cookie ${cookieName}:`, error)
    }
  })
  
  // Add cache control headers to prevent caching
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  
  console.log('[Force Signout] All cookies cleared, redirecting to home')
  
  return response
}

export async function POST(request: NextRequest) {
  // Same as GET
  return GET(request)
}