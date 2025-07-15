import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

// Function to get a Graph API token
async function getGraphToken() {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Missing required environment variables for Azure AD');
  }

  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const scope = 'https://graph.microsoft.com/.default';

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      scope,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Graph token acquisition failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Newsletter API temporarily disabled while troubleshooting Viva Engage
export async function GET(request: NextRequest) {
  console.log('SharePoint newsletter archive API is temporarily disabled while troubleshooting Viva Engage');

  // Get the path parameter from the request for logging purposes
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  console.log(`Received request for newsletter archive path: ${path || 'none'}, but functionality is disabled`);

  return NextResponse.json({
    success: false,
    disabled: true,
    message: 'Newsletter functionality is temporarily disabled while troubleshooting Viva Engage',
    path: path
  }, { status: 503 }) // 503 Service Unavailable
}
