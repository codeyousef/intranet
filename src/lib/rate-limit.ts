import { NextRequest, NextResponse } from 'next/server';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Different rate limiters for different endpoints
const rateLimiters = {
  // API endpoints - stricter limits
  api: new RateLimiterMemory({
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds (1 minute)
    blockDuration: 60, // Block for 1 minute
  }),
  
  // Authentication endpoints - moderate strictness
  auth: new RateLimiterMemory({
    points: 10, // Increased from 5 to 10 attempts
    duration: 300, // Per 5 minutes
    blockDuration: 300, // Reduced from 15 to 5 minutes
  }),
  
  // Weather API - moderate limits
  weather: new RateLimiterMemory({
    points: 60, // 60 requests
    duration: 3600, // Per hour
    blockDuration: 300, // Block for 5 minutes
  }),
  
  // Admin endpoints - moderate limits
  admin: new RateLimiterMemory({
    points: 50,
    duration: 60,
    blockDuration: 120,
  }),
  
  // General pages - relaxed limits
  general: new RateLimiterMemory({
    points: 200,
    duration: 60,
    blockDuration: 30,
  }),
};

// Helper to get client identifier
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  const remoteAddr = request.headers.get('x-remote-addr');
  
  // Log all available headers for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Rate Limiter] IP Detection:', {
      'x-forwarded-for': forwardedFor,
      'x-real-ip': realIp,
      'cf-connecting-ip': cfConnectingIp,
      'x-remote-addr': remoteAddr,
      'url': request.url,
      'method': request.method
    });
  }
  
  // Priority order for IP detection
  if (forwardedFor) {
    // Take the first IP if there are multiple (client's IP)
    const firstIp = forwardedFor.split(',')[0].trim();
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Rate Limiter] Using x-forwarded-for: ${firstIp}`);
    }
    return firstIp;
  }
  
  if (realIp) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Rate Limiter] Using x-real-ip: ${realIp}`);
    }
    return realIp;
  }
  
  if (cfConnectingIp) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Rate Limiter] Using cf-connecting-ip: ${cfConnectingIp}`);
    }
    return cfConnectingIp;
  }
  
  if (remoteAddr) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Rate Limiter] Using x-remote-addr: ${remoteAddr}`);
    }
    return remoteAddr;
  }
  
  // Generate a more unique fallback identifier
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const acceptLanguage = request.headers.get('accept-language') || 'unknown';
  const fallbackId = `fallback-${userAgent.substring(0, 20)}-${acceptLanguage.substring(0, 10)}-${Date.now()}`;
  
  console.warn(`[Rate Limiter] No IP found, using fallback: ${fallbackId}`);
  return fallbackId;
}

// Main rate limiting function
export async function rateLimit(
  request: NextRequest,
  type: keyof typeof rateLimiters = 'api'
): Promise<NextResponse | null> {
  const identifier = getClientIdentifier(request);
  const rateLimiter = rateLimiters[type];
  
  // Log rate limit check (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Rate Limiter] Checking rate limit for ${identifier} on ${type} endpoint`);
  }
  
  try {
    await rateLimiter.consume(identifier);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Rate Limiter] Request allowed for ${identifier}`);
    }
    return null; // Request allowed
  } catch (rateLimiterRes) {
    // Calculate retry after time
    const retryAfter = Math.round((rateLimiterRes as any).msBeforeNext / 1000) || 60;
    
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': rateLimiter.points.toString(),
          'X-RateLimit-Remaining': (rateLimiterRes as any).remainingPoints?.toString() || '0',
          'X-RateLimit-Reset': new Date(Date.now() + (rateLimiterRes as any).msBeforeNext).toISOString(),
        },
      }
    );
  }
}

// Middleware helper for API routes
export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  type: keyof typeof rateLimiters = 'api'
): Promise<NextResponse> {
  const rateLimitResponse = await rateLimit(request, type);
  
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  return handler();
}