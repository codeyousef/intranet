import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🧪 Testing SharePoint authentication...');
  
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      hasClientId: !!process.env.AZURE_AD_CLIENT_ID,
      hasTenantId: !!process.env.AZURE_AD_TENANT_ID,
      hasClientSecret: !!process.env.AZURE_AD_CLIENT_SECRET,
      nodeEnv: process.env.NODE_ENV,
    },
    tests: [] as any[],
  };

  // Test 1: Get SharePoint Token
  try {
    console.log('Test 1: Getting SharePoint token...');
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.AZURE_AD_CLIENT_ID!,
          client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
          scope: 'https://flyadeal.sharepoint.com/.default',
          grant_type: 'client_credentials',
        }),
      }
    );

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      results.tests.push({
        test: 'SharePoint Token Acquisition',
        status: 'SUCCESS',
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
      });

      // Test 2: Access SharePoint Site
      console.log('Test 2: Accessing SharePoint site...');
      const siteUrl = 'https://flyadeal.sharepoint.com/sites/Thelounge';
      const siteResponse = await fetch(
        `${siteUrl}/_api/web/title`,
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json;odata=verbose',
          },
        }
      );

      if (siteResponse.ok) {
        const siteData = await siteResponse.json();
        results.tests.push({
          test: 'SharePoint Site Access',
          status: 'SUCCESS',
          siteTitle: siteData.d.Title,
        });
      } else {
        const errorText = await siteResponse.text();
        results.tests.push({
          test: 'SharePoint Site Access',
          status: 'FAILED',
          httpStatus: siteResponse.status,
          error: errorText.substring(0, 200),
        });
      }

      // Test 3: List root folders
      console.log('Test 3: Listing root folders...');
      const foldersResponse = await fetch(
        `${siteUrl}/_api/web/folders`,
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json;odata=verbose',
          },
        }
      );

      if (foldersResponse.ok) {
        const foldersData = await foldersResponse.json();
        const folderNames = foldersData.d.results.map((f: any) => f.Name);
        results.tests.push({
          test: 'List Folders',
          status: 'SUCCESS',
          folders: folderNames.slice(0, 10), // First 10 folders
        });
      } else {
        results.tests.push({
          test: 'List Folders',
          status: 'FAILED',
          httpStatus: foldersResponse.status,
        });
      }

    } else {
      const errorText = await tokenResponse.text();
      results.tests.push({
        test: 'SharePoint Token Acquisition',
        status: 'FAILED',
        httpStatus: tokenResponse.status,
        error: errorText,
      });
    }
  } catch (error: any) {
    results.tests.push({
      test: 'SharePoint Token Acquisition',
      status: 'ERROR',
      error: error.message,
    });
  }

  // Test 4: Get Graph Token
  try {
    console.log('Test 4: Getting Graph API token...');
    const graphResponse = await fetch(
      `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.AZURE_AD_CLIENT_ID!,
          client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      }
    );

    if (graphResponse.ok) {
      const graphData = await graphResponse.json();
      results.tests.push({
        test: 'Graph API Token Acquisition',
        status: 'SUCCESS',
      });

      // Test 5: Access site via Graph
      const siteResponse = await fetch(
        'https://graph.microsoft.com/v1.0/sites/flyadeal.sharepoint.com:/sites/Thelounge',
        {
          headers: {
            'Authorization': `Bearer ${graphData.access_token}`,
            'Accept': 'application/json',
          },
        }
      );

      if (siteResponse.ok) {
        const siteData = await siteResponse.json();
        results.tests.push({
          test: 'Graph API Site Access',
          status: 'SUCCESS',
          siteId: siteData.id,
          siteName: siteData.name,
        });
      } else {
        results.tests.push({
          test: 'Graph API Site Access',
          status: 'FAILED',
          httpStatus: siteResponse.status,
        });
      }
    } else {
      results.tests.push({
        test: 'Graph API Token Acquisition',
        status: 'FAILED',
        httpStatus: graphResponse.status,
      });
    }
  } catch (error: any) {
    results.tests.push({
      test: 'Graph API Token Acquisition',
      status: 'ERROR',
      error: error.message,
    });
  }

  // Return results
  const allPassed = results.tests.every(t => t.status === 'SUCCESS');
  
  return NextResponse.json(results, {
    status: allPassed ? 200 : 500,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}