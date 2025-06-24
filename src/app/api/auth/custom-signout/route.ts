import { NextRequest, NextResponse } from 'next/server'

// Helper function to clear auth cookies
function clearAuthCookies(response: NextResponse, request: NextRequest) {
  // Check if we're on HTTPS
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const isSecure = protocol === 'https' || request.url.startsWith('https://');
  
  // List of all possible cookie names
  const allCookies = [
    'next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url',
    'next-auth.pkce.code_verifier',
    '__Secure-next-auth.session-token',
    '__Secure-next-auth.csrf-token',
    '__Secure-next-auth.callback-url'
  ];
  
  // Clear each cookie by setting it with maxAge=0
  allCookies.forEach(cookieName => {
    try {
      // Skip secure cookies on HTTP to avoid browser warnings
      if (!isSecure && cookieName.startsWith('__Secure-')) {
        return;
      }
      
      response.cookies.set(cookieName, '', {
        maxAge: 0,
        path: '/',
        secure: cookieName.startsWith('__Secure-'),
        sameSite: 'lax',
        httpOnly: true
      })
    } catch (error) {
      console.log(`[Custom Signout] Could not clear cookie ${cookieName}:`, error);
    }
  })
  
  return response
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Custom Signout] Processing POST signout request')
    
    // Create response with cleared cookies
    const response = NextResponse.json({ success: true }, { status: 200 })
    
    clearAuthCookies(response, request)
    
    console.log('[Custom Signout] Cookies cleared successfully')
    
    return response
  } catch (error) {
    console.error('[Custom Signout] Error:', error)
    // Even if there's an error, return success to allow client to proceed
    return NextResponse.json({ success: true }, { status: 200 })
  }
}

// Also support GET method for easier testing
export async function GET(request: NextRequest) {
  try {
    console.log('[Custom Signout] Processing GET signout request')
    
    // Redirect to home page with cookies cleared
    const response = NextResponse.redirect(new URL('/', request.url))
    
    clearAuthCookies(response, request)
    
    console.log('[Custom Signout] Cookies cleared successfully, redirecting to home')
    
    return response
  } catch (error) {
    console.error('[Custom Signout] GET Error:', error)
    // Even if there's an error, redirect to home
    return NextResponse.redirect(new URL('/', request.url))
  }
}