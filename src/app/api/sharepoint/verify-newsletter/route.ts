import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check session
    const session = await getAuthSession();
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    // Get app token for Graph API
    let appToken = '';
    try {
      const clientId = process.env.AZURE_AD_CLIENT_ID;
      const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
      const tenantId = process.env.AZURE_AD_TENANT_ID;

      if (!clientId || !clientSecret || !tenantId) {
        throw new Error('Missing required environment variables');
      }

      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      });
      
      if (tokenResponse.ok) {
        const data = await tokenResponse.json();
        appToken = data.access_token;
      }
    } catch (e) {
      console.error('Failed to get app token:', e);
    }

    const results: {
      timestamp: string;
      user: string | null | undefined;
      tests: Array<{
        name: string;
        url?: string;
        status?: number;
        statusText?: string;
        success?: boolean;
        data?: any;
        error?: string;
      }>;
      summary?: {
        totalTests: number;
        successful: number;
        failed: number;
        recommendations: string[];
      };
    } = {
      timestamp: new Date().toISOString(),
      user: session.user?.email,
      tests: []
    };

    // Test 1: Try to list files in CEO Newsletter folder using Graph API
    if (appToken) {
      try {
        const searchUrl = "https://graph.microsoft.com/v1.0/sites/flyadeal.sharepoint.com:/sites/Thelounge:/drive/root/search(q='newsletter')";
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${appToken}`,
            'Accept': 'application/json'
          }
        });

        results.tests.push({
          name: 'Graph API - Search for newsletter files',
          url: searchUrl,
          status: searchResponse.status,
          statusText: searchResponse.statusText,
          success: searchResponse.ok
        });

        if (searchResponse.ok) {
          const data = await searchResponse.json();
          results.tests[results.tests.length - 1].data = {
            filesFound: data.value?.map((f: any) => ({
              name: f.name,
              webUrl: f.webUrl,
              path: f.parentReference?.path
            }))
          };
        }
      } catch (error: any) {
        results.tests.push({
          name: 'Graph API - Search for newsletter files',
          error: error.message,
          success: false
        });
      }
    }

    // Test 2: Try SharePoint API to list CEO Newsletter folder
    try {
      const folderUrl = "https://flyadeal.sharepoint.com/_api/web/GetFolderByServerRelativeUrl('/sites/Thelounge/CEO Newsletter')";
      const folderResponse = await fetch(folderUrl, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/json;odata=verbose'
        }
      });

      results.tests.push({
        name: 'SharePoint API - Check CEO Newsletter folder',
        url: folderUrl,
        status: folderResponse.status,
        statusText: folderResponse.statusText,
        success: folderResponse.ok
      });

      if (folderResponse.ok) {
        const data = await folderResponse.json();
        results.tests[results.tests.length - 1].data = {
          folderExists: true,
          folderPath: data.d?.ServerRelativeUrl
        };
      }
    } catch (error: any) {
      results.tests.push({
        name: 'SharePoint API - Check CEO Newsletter folder',
        error: error.message,
        success: false
      });
    }

    // Test 3: Try different paths for the newsletter
    const newsletterPaths = [
      '/sites/Thelounge/CEO Newsletter/last-newsletter.html',
      '/sites/Thelounge/Shared Documents/CEO Newsletter/last-newsletter.html',
      '/sites/Thelounge/SitePages/CEO Newsletter/last-newsletter.html',
      '/sites/Thelounge/CEO Newsletter/Newsletter.html'
    ];

    for (const path of newsletterPaths) {
      try {
        const fileUrl = `https://flyadeal.sharepoint.com/_api/web/GetFileByServerRelativeUrl('${path}')`;
        const fileResponse = await fetch(fileUrl, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/json;odata=verbose'
          }
        });

        results.tests.push({
          name: `Check file: ${path}`,
          url: fileUrl,
          status: fileResponse.status,
          statusText: fileResponse.statusText,
          success: fileResponse.ok
        });

        if (fileResponse.ok) {
          const data = await fileResponse.json();
          results.tests[results.tests.length - 1].data = {
            fileInfo: {
              name: data.d?.Name,
              serverRelativeUrl: data.d?.ServerRelativeUrl,
              timeLastModified: data.d?.TimeLastModified
            }
          };
          break; // Found the file
        }
      } catch (error: any) {
        results.tests.push({
          name: `Check file: ${path}`,
          error: error.message,
          success: false
        });
      }
    }

    // Summary
    results.summary = {
      totalTests: results.tests.length,
      successful: results.tests.filter(t => t.success).length,
      failed: results.tests.filter(t => !t.success).length,
      recommendations: []
    };

    // Add recommendations
    if (results.tests.every(t => !t.success)) {
      results.summary.recommendations.push(
        'The newsletter file may have been moved or renamed',
        'Check SharePoint directly to verify the file location',
        'Ensure the user has access to the CEO Newsletter folder'
      );
    }

    return NextResponse.json(results);

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}