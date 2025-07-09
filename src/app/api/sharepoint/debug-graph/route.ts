import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🧪 Testing SharePoint Graph API access...');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as any[],
  };

  try {
    // Step 1: Get Graph API token
    console.log('Getting Graph API token...');
    const tokenResponse = await fetch(
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

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      results.tests.push({
        test: 'Graph Token Acquisition',
        status: 'FAILED',
        error,
      });
      return NextResponse.json(results, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    results.tests.push({
      test: 'Graph Token Acquisition',
      status: 'SUCCESS',
      expiresIn: tokenData.expires_in,
    });

    // Step 2: Get site information first
    console.log('Getting site information...');
    const siteResponse = await fetch(
      'https://graph.microsoft.com/v1.0/sites/flyadeal.sharepoint.com:/sites/Thelounge',
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!siteResponse.ok) {
      const error = await siteResponse.text();
      results.tests.push({
        test: 'Get Site Info',
        status: 'FAILED',
        httpStatus: siteResponse.status,
        error,
      });
      return NextResponse.json(results, { status: 500 });
    }

    const siteData = await siteResponse.json();
    results.tests.push({
      test: 'Get Site Info',
      status: 'SUCCESS',
      siteId: siteData.id,
      siteName: siteData.name,
      webUrl: siteData.webUrl,
    });

    // Step 3: List files using the site ID
    console.log('Listing files using site ID...');
    const filesResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteData.id}/drive/root/children`,
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!filesResponse.ok) {
      const error = await filesResponse.text();
      results.tests.push({
        test: 'List Files',
        status: 'FAILED',
        httpStatus: filesResponse.status,
        error,
      });
    } else {
      const filesData = await filesResponse.json();
      results.tests.push({
        test: 'List Files',
        status: 'SUCCESS',
        fileCount: filesData.value?.length || 0,
        files: filesData.value?.slice(0, 5).map((f: any) => ({
          name: f.name,
          type: f.folder ? 'Folder' : 'File',
          size: f.size,
        })),
      });
    }

    // Step 4: Try the direct approach (for comparison)
    console.log('Trying direct approach...');
    const directResponse = await fetch(
      'https://graph.microsoft.com/v1.0/sites/flyadeal.sharepoint.com:/sites/Thelounge/drive/root/children',
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!directResponse.ok) {
      const error = await directResponse.text();
      results.tests.push({
        test: 'Direct Approach',
        status: 'FAILED',
        httpStatus: directResponse.status,
        error,
      });
    } else {
      const directData = await directResponse.json();
      results.tests.push({
        test: 'Direct Approach',
        status: 'SUCCESS',
        fileCount: directData.value?.length || 0,
      });
    }

  } catch (error: any) {
    results.tests.push({
      test: 'Unexpected Error',
      status: 'ERROR',
      error: error.message,
    });
  }

  const allPassed = results.tests.every(t => t.status === 'SUCCESS');
  
  return NextResponse.json(results, {
    status: allPassed ? 200 : 500,
  });
}