import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

/**
 * Debug endpoint to check SharePoint permissions and authentication
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {
      hasClientId: !!process.env.AZURE_AD_CLIENT_ID,
      hasClientSecret: !!process.env.AZURE_AD_CLIENT_SECRET,
      hasTenantId: !!process.env.AZURE_AD_TENANT_ID,
      clientId: process.env.AZURE_AD_CLIENT_ID?.substring(0, 8) + '...',
      tenantId: process.env.AZURE_AD_TENANT_ID?.substring(0, 8) + '...'
    },
    tests: []
  };

  // Test 1: Check user session
  results.tests.push({
    name: 'User Session Check',
    status: 'running'
  });

  try {
    const session = await getAuthSession();
    if (session && session.accessToken) {
      results.tests[0].status = 'success';
      results.tests[0].details = {
        hasSession: true,
        userEmail: session.user?.email,
        tokenLength: session.accessToken.length,
        tokenPrefix: session.accessToken.substring(0, 20) + '...'
      };
    } else {
      results.tests[0].status = 'failed';
      results.tests[0].details = { hasSession: !!session, hasToken: false };
    }
  } catch (error: any) {
    results.tests[0].status = 'error';
    results.tests[0].error = error.message;
  }

  // Test 2: Get Graph API token (application)
  results.tests.push({
    name: 'Graph API Token (Application)',
    status: 'running'
  });

  let graphToken = '';
  try {
    const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_CLIENT_ID!,
        client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      graphToken = data.access_token;
      results.tests[1].status = 'success';
      results.tests[1].details = {
        tokenLength: graphToken.length,
        expiresIn: data.expires_in,
        scope: data.scope
      };
    } else {
      const error = await response.text();
      results.tests[1].status = 'failed';
      results.tests[1].error = error;
    }
  } catch (error: any) {
    results.tests[1].status = 'error';
    results.tests[1].error = error.message;
  }

  // Test 3: Check Graph API permissions
  if (graphToken) {
    results.tests.push({
      name: 'Graph API Permissions Check',
      status: 'running'
    });

    try {
      // Check what permissions the token has
      const permResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { 'Authorization': `Bearer ${graphToken}` }
      });

      // This will fail for app-only tokens, but the error tells us about permissions
      const permError = await permResponse.text();
      
      // Try to access SharePoint
      const spResponse = await fetch('https://graph.microsoft.com/v1.0/sites/flyadeal.sharepoint.com', {
        headers: { 'Authorization': `Bearer ${graphToken}` }
      });

      if (spResponse.ok) {
        results.tests[2].status = 'success';
        results.tests[2].details = {
          canAccessSharePoint: true,
          sitesResponse: await spResponse.json()
        };
      } else {
        const spError = await spResponse.text();
        results.tests[2].status = 'failed';
        results.tests[2].details = {
          canAccessSharePoint: false,
          error: spError,
          statusCode: spResponse.status,
          hint: 'Missing Sites.Read.All or Sites.ReadWrite.All application permission'
        };
      }
    } catch (error: any) {
      results.tests[2].status = 'error';
      results.tests[2].error = error.message;
    }
  }

  // Test 4: Direct newsletter access with user token
  const session = await getAuthSession();
  if (session && session.accessToken) {
    results.tests.push({
      name: 'Direct Newsletter Access (User Token)',
      status: 'running'
    });

    try {
      const newsletterUrl = 'https://flyadeal.sharepoint.com/sites/Thelounge/CEO%20Newsletter/last-newsletter.html';
      const response = await fetch(newsletterUrl, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'text/html'
        }
      });

      results.tests[3].status = response.ok ? 'success' : 'failed';
      results.tests[3].details = {
        statusCode: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type')
      };

      if (!response.ok) {
        results.tests[3].hint = 'User may not have permissions to access this file in SharePoint';
      }
    } catch (error: any) {
      results.tests[3].status = 'error';
      results.tests[3].error = error.message;
    }
  }

  // Summary
  results.summary = {
    duration: Date.now() - startTime,
    testsRun: results.tests.length,
    testsPassed: results.tests.filter((t: any) => t.status === 'success').length,
    recommendations: []
  };

  // Add recommendations based on test results
  if (results.tests[1].status === 'success' && results.tests[2]?.status === 'failed') {
    results.summary.recommendations.push(
      'Add Sites.Read.All application permission in Azure AD',
      'Grant admin consent for the new permissions'
    );
  }

  if (results.tests[3]?.status === 'failed') {
    results.summary.recommendations.push(
      'Ensure users have access to the SharePoint newsletter file',
      'Or implement application-level permissions for consistent access'
    );
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}