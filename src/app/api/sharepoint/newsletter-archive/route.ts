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

export async function GET(request: NextRequest) {
  try {
    console.log('Newsletter archive API request received');
    
    // Get the path parameter from the request
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    
    console.log(`Fetching newsletter archive file: ${path || 'none'}`);
    
    if (!path) {
      return NextResponse.json({
        success: false,
        message: 'Path parameter is required'
      }, { status: 400 });
    }

    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      console.log('No authentication session found');
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Get Graph API token
    const accessToken = await getGraphToken();
    
    // SharePoint site details
    const siteUrl = 'https://nasairgroup.sharepoint.com/sites/Flyadeal';
    const sitePath = '/sites/Flyadeal';
    
    // First, get the site ID
    const siteResponse = await fetch(`https://graph.microsoft.com/v1.0/sites/nasairgroup.sharepoint.com:${sitePath}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!siteResponse.ok) {
      console.error('Failed to get site information:', await siteResponse.text());
      return NextResponse.json({
        success: false,
        message: 'Failed to access SharePoint site'
      }, { status: 503 });
    }

    const siteData = await siteResponse.json();
    const siteId = siteData.id;
    
    // Get the file content using the path
    const encodedPath = encodeURIComponent(path);
    const fileUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:${encodedPath}:/content`;
    
    console.log(`Fetching file from: ${fileUrl}`);
    
    const fileResponse = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!fileResponse.ok) {
      console.error('Failed to fetch file:', fileResponse.status, await fileResponse.text());
      return NextResponse.json({
        success: false,
        message: `Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`,
        path: path
      }, { status: fileResponse.status });
    }

    const fileContent = await fileResponse.text();
    
    console.log(`Successfully fetched file content (${fileContent.length} characters)`);
    
    return NextResponse.json({
      success: true,
      content: fileContent,
      path: path
    });

  } catch (error) {
    console.error('Error in newsletter archive API:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
