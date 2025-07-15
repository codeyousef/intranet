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
  
  // Authentication endpoints - very strict
  auth: new RateLimiterMemory({
    points: 5, // Only 5 attempts
    duration: 300, // Per 5 minutes
    blockDuration: 900, // Block for 15 minutes
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
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to a generic identifier if no IP is found
  return 'anonymous';
}

// Main rate limiting function
export async function rateLimit(
  request: NextRequest,
  type: keyof typeof rateLimiters = 'api'
): Promise<NextResponse | null> {
  const identifier = getClientIdentifier(request);
  const rateLimiter = rateLimiters[type];
  
  try {
    await rateLimiter.consume(identifier);
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