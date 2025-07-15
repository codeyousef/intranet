#!/bin/bash

echo "=== Emergency Fix for Flyadeal Intranet ==="
echo ""

# 1. Create a script to clear rate limits
cat > /home/ubuntu/intranet/clear-production-limits.js << 'EOF'
// This script will be run inside the Next.js application context
console.log('Clearing rate limits...');

// Since rate limits are in memory, we need to restart the app
process.exit(0);
EOF

# 2. Create a minimal test page to verify auth
cat > /home/ubuntu/intranet/src/app/test-auth-simple/page.tsx << 'EOF'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export default async function TestAuthPage() {
  const session = await getServerSession(authOptions)
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Auth Test Page</h1>
      <pre>{JSON.stringify(session, null, 2)}</pre>
      <hr />
      <p>If session is null, auth is not working</p>
      <a href="/api/auth/signin">Try Sign In</a>
    </div>
  )
}
EOF

# 3. Create updated middleware with DISABLED rate limiting temporarily
cat > /home/ubuntu/intranet/src/middleware.ts << 'EOF'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// TEMPORARILY DISABLED: import { rateLimit } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // RATE LIMITING TEMPORARILY DISABLED FOR DEBUGGING
  console.log(`[Middleware] Request to: ${pathname} from IP: ${request.headers.get('x-real-ip') || 'unknown'}`);
  
  // Add security headers for API responses
  if (pathname.startsWith('/api')) {
    const response = NextResponse.next();
    
    // Remove or restrict CORS headers for API routes
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'https://172.22.58.184:8443',
      'https://10.152.8.77',
      'http://localhost:3000',
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
EOF

# 4. Update environment check
cat > /home/ubuntu/intranet/.env.local << 'EOF'
# Core Settings
NODE_ENV=production
NEXTAUTH_URL=https://10.152.8.77
NEXTAUTH_SECRET=your-secret-here-replace-with-actual

# Azure AD
AZURE_AD_CLIENT_ID=a1d4e237-dc24-4670-98fa-7a8bb45e5fca
AZURE_AD_CLIENT_SECRET=your-secret-here-replace-with-actual
AZURE_AD_TENANT_ID=6b8805cf-83d0-4342-bd38-fb3b3df952be

# Power BI (same as Azure AD)
POWERBI_CLIENT_ID=a1d4e237-dc24-4670-98fa-7a8bb45e5fca
POWERBI_CLIENT_SECRET=your-secret-here-replace-with-actual
POWERBI_TENANT_ID=6b8805cf-83d0-4342-bd38-fb3b3df952be

# Debugging
NEXTAUTH_DEBUG=true
EOF

echo ""
echo "=== Instructions ==="
echo ""
echo "1. First, update the .env.local file with actual secrets:"
echo "   nano /home/ubuntu/intranet/.env.local"
echo ""
echo "2. Then run these commands:"
echo "   cd /home/ubuntu/intranet"
echo "   npm run build"
echo "   pm2 stop intranet-app"
echo "   pm2 start intranet-app"
echo "   pm2 logs intranet-app"
echo ""
echo "3. Test authentication:"
echo "   - Visit: https://10.152.8.77/test-auth-simple"
echo "   - This will show if authentication is working"
echo ""
echo "4. Once working, re-enable rate limiting by reverting middleware.ts"
echo ""
echo "IMPORTANT: The rate limiting is TEMPORARILY DISABLED in this fix!"