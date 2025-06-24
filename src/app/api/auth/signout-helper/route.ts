import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('[Signout Helper] Processing signout')
  
  // Create a response that redirects to the NextAuth signout endpoint
  // This ensures proper session cleanup
  const signoutUrl = new URL('/api/auth/signout', request.url)
  signoutUrl.searchParams.set('callbackUrl', '/')
  
  return NextResponse.redirect(signoutUrl)
}