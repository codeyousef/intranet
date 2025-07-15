import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test different URL variations for the newsletter
    const urlVariations = [
      // Original URL with space
      'https://flyadeal.sharepoint.com/sites/Thelounge/CEO%20Newsletter/last-newsletter.html',
      // Try with different encoding
      'https://flyadeal.sharepoint.com/sites/Thelounge/CEO Newsletter/last-newsletter.html',
      // Try shared documents path
      'https://flyadeal.sharepoint.com/sites/Thelounge/Shared%20Documents/CEO%20Newsletter/last-newsletter.html',
      // Try without .html extension
      'https://flyadeal.sharepoint.com/sites/Thelounge/CEO%20Newsletter/last-newsletter',
      // Try different file name
      'https://flyadeal.sharepoint.com/sites/Thelounge/CEO%20Newsletter/Newsletter.html',
      // Try index.html
      'https://flyadeal.sharepoint.com/sites/Thelounge/CEO%20Newsletter/index.html'
    ];

    const results: Array<{
      url: string;
      status?: number;
      statusText?: string;
      contentType?: string | null;
      contentLength?: string | null;
      success?: boolean;
      error?: any;
      preview?: string;
      fullLength?: number;
      api?: string;
      files?: any;
    }> = [];

    for (const url of urlVariations) {
      try {
        console.log(`Testing URL: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'text/html, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        results.push({
          url,
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          success: response.ok
        });

        // If successful, try to get a preview of content
        if (response.ok) {
          const text = await response.text();
          results[results.length - 1].preview = text.substring(0, 200);
          results[results.length - 1].fullLength = text.length;
        }
      } catch (error: any) {
        results.push({
          url,
          error: error.message,
          success: false
        });
      }
    }

    // Also test SharePoint REST API
    const restUrl = "https://flyadeal.sharepoint.com/_api/web/GetFolderByServerRelativeUrl('/sites/Thelounge/CEO Newsletter')/Files";
    try {
      
      const restResponse = await fetch(restUrl, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/json;odata=verbose'
        }
      });

      if (restResponse.ok) {
        const data = await restResponse.json();
        results.push({
          api: 'REST API - List Files',
          url: restUrl,
          status: restResponse.status,
          files: data.d?.results?.map((f: any) => ({
            name: f.Name,
            serverRelativeUrl: f.ServerRelativeUrl,
            timeLastModified: f.TimeLastModified
          })),
          success: true
        });
      } else {
        results.push({
          api: 'REST API - List Files',
          url: restUrl,
          status: restResponse.status,
          statusText: restResponse.statusText,
          success: false
        });
      }
    } catch (error: any) {
      results.push({
        url: restUrl,
        api: 'REST API - List Files',
        error: error.message,
        success: false
      });
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      userEmail: session.user?.email,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}