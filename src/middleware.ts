import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Determine rate limit type based on path
  let rateLimitType: 'api' | 'auth' | 'weather' | 'admin' | 'general' = 'general';
  
  if (pathname.startsWith('/api/auth')) {
    rateLimitType = 'auth';
  } else if (pathname.startsWith('/api/weather')) {
    rateLimitType = 'weather';
  } else if (pathname.startsWith('/api/admin') || pathname.startsWith('/admin')) {
    rateLimitType = 'admin';
  } else if (pathname.startsWith('/api')) {
    rateLimitType = 'api';
  }
  
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(request, rateLimitType);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  // Add security headers for API responses
  if (pathname.startsWith('/api')) {
    const response = NextResponse.next();
    
    // Remove or restrict CORS headers for API routes
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'https://172.22.58.184:8443',
      'http://localhost:3001',
      process.env.NEXTAUTH_URL
    ].filter(Boolean);
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    return response;
  }
  
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match admin pages
    '/admin/:path*',
    // Exclude static files and images
    '/((?!_next/static|_next/image|favicon.ico|images/).*)',
  ],
};