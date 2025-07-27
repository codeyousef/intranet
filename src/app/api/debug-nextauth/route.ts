import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Only allow in development or with debug flag
  if (process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_DEBUG !== 'true') {
    return NextResponse.json({ error: 'Debug endpoint disabled' }, { status: 403 });
  }

  const debug: any = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_DEBUG: process.env.NEXTAUTH_DEBUG
    },
    azureAD: {
      clientId: process.env.AZURE_AD_CLIENT_ID || 'NOT SET',
      tenantId: process.env.AZURE_AD_TENANT_ID || 'NOT SET',
      clientSecretInfo: {
        exists: !!process.env.AZURE_AD_CLIENT_SECRET,
        length: process.env.AZURE_AD_CLIENT_SECRET?.length || 0,
        preview: process.env.AZURE_AD_CLIENT_SECRET 
          ? `${process.env.AZURE_AD_CLIENT_SECRET.substring(0, 4)}...${process.env.AZURE_AD_CLIENT_SECRET.substring(process.env.AZURE_AD_CLIENT_SECRET.length - 4)}`
          : 'NOT SET'
      }
    },
    secretAnalysis: {},
    headers: {
      host: request.headers.get('host'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      'x-forwarded-host': request.headers.get('x-forwarded-host')
    }
  };

  // Analyze the secret
  const secret = process.env.AZURE_AD_CLIENT_SECRET;
  if (secret) {
    debug.secretAnalysis = {
      length: secret.length,
      hasLowercase: /[a-z]/.test(secret),
      hasUppercase: /[A-Z]/.test(secret),
      hasNumbers: /[0-9]/.test(secret),
      hasSpecialChars: /[^a-zA-Z0-9]/.test(secret),
      specialChars: secret.match(/[^a-zA-Z0-9]/g)?.join(', ') || 'none',
      startsWithQuote: secret.startsWith('"'),
      endsWithQuote: secret.endsWith('"'),
      hasSpaces: secret.includes(' '),
      hasBackslash: secret.includes('\\'),
      looksLikeUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(secret),
      encoding: {
        isBase64: /^[a-zA-Z0-9+/]+=*$/.test(secret),
        isPrintableASCII: /^[\x20-\x7E]+$/.test(secret)
      }
    };

    // Test different encodings
    debug.secretAnalysis.encodingTests = {
      raw: secret.substring(0, 10) + '...',
      urlEncoded: encodeURIComponent(secret).substring(0, 20) + '...',
      base64: Buffer.from(secret).toString('base64').substring(0, 20) + '...'
    };
  }

  // Test callback URL construction
  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`;
  debug.callbackUrl = {
    constructed: callbackUrl,
    expectedHost: process.env.NEXTAUTH_URL,
    actualHost: `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
  };

  return NextResponse.json(debug, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}