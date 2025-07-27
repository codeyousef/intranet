import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  const health = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    checks: {
      environment: false,
      session: false,
      provider: false
    },
    details: {} as any
  };

  // Check environment variables
  const requiredEnvVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'AZURE_AD_CLIENT_ID',
    'AZURE_AD_CLIENT_SECRET',
    'AZURE_AD_TENANT_ID'
  ];

  const envCheck = requiredEnvVars.map(varName => {
    const value = process.env[varName];
    const exists = !!value;
    
    let displayValue = 'NOT SET';
    if (exists) {
      if (varName.includes('SECRET')) {
        displayValue = value.length > 8 
          ? `${value.substring(0, 4)}...${value.substring(value.length - 4)} (length: ${value.length})`
          : '***HIDDEN***';
      } else if (varName.includes('ID')) {
        displayValue = value.substring(0, 8) + '...';
      } else {
        displayValue = value;
      }
    }
    
    return {
      name: varName,
      exists,
      value: displayValue
    };
  });

  health.details.environment = envCheck;
  health.checks.environment = envCheck.every(check => check.exists);

  // Check for common secret issues
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  if (clientSecret) {
    const secretAnalysis = {
      length: clientSecret.length,
      hasSpecialChars: /[^a-zA-Z0-9\-_.~]/.test(clientSecret),
      looksLikeUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientSecret)
    };
    
    health.details.secretAnalysis = secretAnalysis;
    
    if (secretAnalysis.looksLikeUUID) {
      health.details.warning = 'Client secret looks like a UUID/Secret ID. You should use the secret VALUE, not the ID!';
    }
  }

  // Check session
  try {
    const session = await getServerSession(authOptions);
    health.checks.session = !!session;
    health.details.session = session ? {
      user: session.user?.email,
      expires: session.expires
    } : null;
  } catch (error) {
    health.details.sessionError = error instanceof Error ? error.message : 'Unknown error';
  }

  // Check provider configuration
  health.checks.provider = !!(
    process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
  );

  // Overall status
  const allChecks = Object.values(health.checks);
  health.status = allChecks.every(check => check) ? 'healthy' : 'unhealthy';
  
  // Add response time
  health.details.responseTime = `${Date.now() - startTime}ms`;

  return NextResponse.json(health, {
    status: health.status === 'healthy' ? 200 : 503
  });
}