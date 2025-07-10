import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getFileContent } from '@/lib/sharepointClient';

// Simple in-memory cache
let cache: {
  content?: string;
  timestamp?: number;
} = {};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  const requestId = `newsletter-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  console.log(`[NEWSLETTER-FIXED] Request started [${requestId}]`);

  try {
    // Check authentication
    const session = await getAuthSession();
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        details: 'Please sign in to view the newsletter'
      }, { status: 401 });
    }

    // Check cache first
    const now = Date.now();
    if (cache.content && cache.timestamp && (now - cache.timestamp < CACHE_DURATION)) {
      console.log(`[NEWSLETTER-FIXED] Returning cached content [${requestId}]`);
      return NextResponse.json({
        success: true,
        newsletter: {
          title: 'CEO Newsletter',
          content: cache.content,
          lastUpdated: new Date(cache.timestamp).toISOString(),
          source: 'SharePoint (cached)',
          cached: true
        },
        requestId
      });
    }

    console.log(`[NEWSLETTER-FIXED] Cache miss, fetching from SharePoint [${requestId}]`);

    try {
      // First, let's try to find the newsletter file
      // Try multiple possible paths
      const possiblePaths = [
        'CEO Newsletter/last-newsletter.html',
        'last-newsletter.html',
        'newsletter.html',
        'CEO Newsletter/Newsletter.html',
        'CEO Newsletter/newsletter.html',
        'Newsletter/last-newsletter.html',
        'CEO Newsletter/Last Newsletter.html',
        'CEO Newsletter/CEO Newsletter.html',
        'CEO Newsletter.html',
        'Newsletter.html'
      ];

      let htmlContent = '';
      let successPath = '';

      // Try each path until we find the file
      for (const path of possiblePaths) {
        try {
          console.log(`[NEWSLETTER-FIXED] Trying path: ${path} [${requestId}]`);
          htmlContent = await getFileContent(path);
          successPath = path;
          console.log(`[NEWSLETTER-FIXED] Success! Found newsletter at: ${path} [${requestId}]`);
          break;
        } catch (error: any) {
          if (!error.message.includes('itemNotFound')) {
            console.error(`[NEWSLETTER-FIXED] Unexpected error for ${path}: ${error.message} [${requestId}]`);
          }
        }
      }

      if (!htmlContent) {
        throw new Error('Newsletter file not found in any of the expected locations');
      }
      
      console.log(`[NEWSLETTER-FIXED] Successfully fetched newsletter, length: ${htmlContent.length} [${requestId}]`);

      // Clean up the HTML content
      let processedContent = htmlContent;
      
      // Remove scripts and styles that might interfere
      processedContent = processedContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      processedContent = processedContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
      
      // Extract body content if it's a full HTML document
      const bodyMatch = processedContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        processedContent = bodyMatch[1];
      }

      // Update cache
      cache = {
        content: processedContent,
        timestamp: Date.now()
      };

      return NextResponse.json({
        success: true,
        newsletter: {
          title: 'CEO Newsletter',
          content: processedContent,
          lastUpdated: new Date().toISOString(),
          source: `SharePoint (fresh) - ${successPath}`,
          cached: false
        },
        requestId
      });

    } catch (error: any) {
      console.error(`[NEWSLETTER-FIXED] Failed to fetch from SharePoint [${requestId}]`, error);
      
      // If we have cached content (even if expired), return it
      if (cache.content) {
        console.log(`[NEWSLETTER-FIXED] Returning expired cache due to error [${requestId}]`);
        return NextResponse.json({
          success: true,
          newsletter: {
            title: 'CEO Newsletter',
            content: cache.content,
            lastUpdated: cache.timestamp ? new Date(cache.timestamp).toISOString() : new Date().toISOString(),
            source: 'SharePoint (expired cache)',
            cached: true,
            warning: 'Unable to fetch latest newsletter, showing previous version'
          },
          requestId
        });
      }

      // Return error with helpful information
      return NextResponse.json({
        success: false,
        error: error.message,
        details: 'Failed to fetch newsletter from SharePoint',
        newsletter: {
          title: 'Newsletter Error',
          content: `
            <div style="padding: 40px; text-align: center; background: #f5f5f5; border-radius: 8px;">
              <h2 style="color: #00539f; margin-bottom: 20px;">Unable to Load Newsletter</h2>
              <p style="color: #666; margin-bottom: 20px;">
                We encountered an error while fetching the newsletter from SharePoint.
              </p>
              <div style="background: white; padding: 20px; border-radius: 4px; text-align: left; max-width: 500px; margin: 0 auto;">
                <p style="margin: 0 0 10px 0;"><strong>Error Details:</strong></p>
                <code style="display: block; background: #f0f0f0; padding: 10px; border-radius: 4px; color: #d32f2f;">
                  ${error.message}
                </code>
              </div>
              <p style="color: #999; font-size: 14px; margin-top: 30px;">
                Request ID: ${requestId}<br>
                Please try again or contact IT support if the issue persists.
              </p>
            </div>
          `,
          lastUpdated: new Date().toISOString(),
          source: 'error'
        },
        requestId
      });
    }

  } catch (error: any) {
    console.error(`[NEWSLETTER-FIXED] Unexpected error [${requestId}]`, error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      newsletter: {
        title: 'Newsletter Error',
        content: `
          <div style="padding: 40px; text-align: center;">
            <h2 style="color: #d32f2f;">Unexpected Error</h2>
            <p>An unexpected error occurred while loading the newsletter.</p>
            <p style="margin-top: 20px; color: #999;">Request ID: ${requestId}</p>
          </div>
        `,
        lastUpdated: new Date().toISOString(),
        source: 'error'
      },
      requestId
    });
  }
}