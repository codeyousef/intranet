import { NextRequest, NextResponse } from 'next/server';

// Edge-compatible rate limiter configuration
type RateLimiterConfig = {
  points: number;      // Number of requests allowed
  duration: number;    // Time window in seconds
  blockDuration: number; // Block duration in seconds
};

// In-memory store for rate limiting (Edge compatible)
const ipRequests = new Map<string, { count: number, resetTime: number, blockedUntil: number }>();

// Different rate limiter configurations for different endpoints
const rateLimiterConfigs: Record<string, RateLimiterConfig> = {
  // API endpoints - stricter limits
  api: {
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds (1 minute)
    blockDuration: 60, // Block for 1 minute
  },

  // Authentication endpoints - relaxed for production issues
  auth: {
    points: 100, // Increased to 100 attempts to prevent blocking
    duration: 60, // Per 1 minute
    blockDuration: 60, // Block for only 1 minute
  },

  // Weather API - moderate limits
  weather: {
    points: 60, // 60 requests
    duration: 3600, // Per hour
    blockDuration: 300, // Block for 5 minutes
  },

  // Admin endpoints - increased limits for testing
  admin: {
    points: 200,
    duration: 60,
    blockDuration: 30,
  },

  // General pages - relaxed limits
  general: {
    points: 200,
    duration: 60,
    blockDuration: 30,
  },
};

// Helper to get client identifier
function getClientIdentifier(request: NextRequest): string {
  // In production, always log the first few requests to debug IP detection
  const shouldLog = process.env.NODE_ENV === 'development' || Math.random() < 0.01; // Log 1% of requests in production

  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  const remoteAddr = request.headers.get('x-remote-addr');
  const trueClientIp = request.headers.get('true-client-ip');
  const clientIp = request.headers.get('client-ip');

  // Get additional identifiers for better differentiation
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const acceptLanguage = request.headers.get('accept-language') || 'unknown';
  const sessionCookie = request.cookies.get('next-auth.session-token')?.value || 
                       request.cookies.get('__Secure-next-auth.session-token')?.value || '';

  // Log all available headers for debugging
  if (shouldLog) {
    console.log('[Rate Limiter] IP Detection Debug:', {
      'x-forwarded-for': forwardedFor,
      'x-real-ip': realIp,
      'cf-connecting-ip': cfConnectingIp,
      'x-remote-addr': remoteAddr,
      'true-client-ip': trueClientIp,
      'client-ip': clientIp,
      'url': request.url,
      'method': request.method,
      'user-agent': userAgent?.substring(0, 50),
      'has-session': !!sessionCookie
    });
  }

  let clientIdentifier: string | null = null;

  // Priority order for IP detection
  if (forwardedFor) {
    // Take the first IP if there are multiple (client's IP)
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    // Filter out local/private IPs
    const publicIp = ips.find(ip => !isPrivateIP(ip)) || ips[0];
    if (shouldLog) {
      console.log(`[Rate Limiter] Using x-forwarded-for: ${publicIp} from ${forwardedFor}`);
    }
    clientIdentifier = publicIp;
  } else if (realIp && !isPrivateIP(realIp)) {
    if (shouldLog) {
      console.log(`[Rate Limiter] Using x-real-ip: ${realIp}`);
    }
    clientIdentifier = realIp;
  } else if (cfConnectingIp) {
    if (shouldLog) {
      console.log(`[Rate Limiter] Using cf-connecting-ip: ${cfConnectingIp}`);
    }
    clientIdentifier = cfConnectingIp;
  } else if (trueClientIp) {
    if (shouldLog) {
      console.log(`[Rate Limiter] Using true-client-ip: ${trueClientIp}`);
    }
    clientIdentifier = trueClientIp;
  } else if (clientIp) {
    if (shouldLog) {
      console.log(`[Rate Limiter] Using client-ip: ${clientIp}`);
    }
    clientIdentifier = clientIp;
  } else if (remoteAddr) {
    if (shouldLog) {
      console.log(`[Rate Limiter] Using x-remote-addr: ${remoteAddr}`);
    }
    clientIdentifier = remoteAddr;
  }

  // If we have a valid IP, optionally combine with session for authenticated users
  if (clientIdentifier) {
    // For authenticated endpoints, combine IP with session to allow higher limits per user
    if (request.url.includes('/api/auth/') && sessionCookie) {
      const sessionHash = sessionCookie.substring(0, 8); // Use first 8 chars of session
      return `${clientIdentifier}-${sessionHash}`;
    }
    return clientIdentifier;
  }

  // Generate a more unique fallback identifier
  const fallbackId = `fallback-${userAgent.substring(0, 20)}-${acceptLanguage.substring(0, 10)}-${Math.random().toString(36).substring(7)}`;

  console.warn(`[Rate Limiter] No IP found, using fallback: ${fallbackId}`);
  return fallbackId;
}

// Helper to check if an IP is private/local
function isPrivateIP(ip: string): boolean {
  return ip === '127.0.0.1' || 
         ip === '::1' || 
         ip.startsWith('10.') || 
         ip.startsWith('172.16.') || 
         ip.startsWith('172.17.') || 
         ip.startsWith('172.18.') || 
         ip.startsWith('172.19.') || 
         ip.startsWith('172.20.') || 
         ip.startsWith('172.21.') || 
         ip.startsWith('172.22.') || 
         ip.startsWith('172.23.') || 
         ip.startsWith('172.24.') || 
         ip.startsWith('172.25.') || 
         ip.startsWith('172.26.') || 
         ip.startsWith('172.27.') || 
         ip.startsWith('172.28.') || 
         ip.startsWith('172.29.') || 
         ip.startsWith('172.30.') || 
         ip.startsWith('172.31.') || 
         ip.startsWith('192.168.');
}

// Main rate limiting function
export async function rateLimit(
  request: NextRequest,
  type: keyof typeof rateLimiterConfigs = 'api'
): Promise<NextResponse | null> {
  const identifier = getClientIdentifier(request);
  const config = rateLimiterConfigs[type];

  // Log rate limit check (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Rate Limiter] Checking rate limit for ${identifier} on ${type} endpoint`);
  }

  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const requestData = ipRequests.get(identifier) || { 
    count: 0, 
    resetTime: now + config.duration,
    blockedUntil: 0 
  };

  // Check if the client is currently blocked
  if (requestData.blockedUntil > now) {
    const retryAfter = requestData.blockedUntil - now;

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
          'X-RateLimit-Limit': config.points.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(requestData.resetTime * 1000).toISOString(),
        },
      }
    );
  }

  // Reset counter if the time window has passed
  if (now > requestData.resetTime) {
    requestData.count = 0;
    requestData.resetTime = now + config.duration;
  }

  // Increment request count
  requestData.count++;

  // Check if rate limit is exceeded
  if (requestData.count > config.points) {
    // Block the client
    requestData.blockedUntil = now + config.blockDuration;
    ipRequests.set(identifier, requestData);

    const retryAfter = config.blockDuration;

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
          'X-RateLimit-Limit': config.points.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(requestData.resetTime * 1000).toISOString(),
        },
      }
    );
  }

  // Update the request data in the map
  ipRequests.set(identifier, requestData);

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Rate Limiter] Request allowed for ${identifier}. Count: ${requestData.count}/${config.points}`);
  }

  return null; // Request allowed
}

// Middleware helper for API routes
export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  type: keyof typeof rateLimiterConfigs = 'api'
): Promise<NextResponse> {
  const rateLimitResponse = await rateLimit(request, type);

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  return handler();
}
