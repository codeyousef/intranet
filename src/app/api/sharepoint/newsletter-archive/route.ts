import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getFileContent } from '@/lib/sharepointClient';

// Cache for newsletter archive content
let cache: {
  [path: string]: {
    content: string;
    timestamp: number;
  }
} = {};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  const requestId = `newsletter-archive-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  console.log(`[NEWSLETTER-ARCHIVE] Request started [${requestId}]`);

  // Declare path variable at a higher scope so it's accessible in the catch block
  let path: string | null = null;

  try {
    // Get the path parameter from the request
    const { searchParams } = new URL(request.url);
    path = searchParams.get('path');
    const forceFetch = searchParams.get('force_fetch') === 'true';
    const clearCache = searchParams.get('clear_cache') === 'true';

    console.log(`[NEWSLETTER-ARCHIVE] Fetching file: ${path || 'none'} [${requestId}]`);
    console.log(`[NEWSLETTER-ARCHIVE] Force fetch: ${forceFetch}, Clear cache: ${clearCache} [${requestId}]`);

    if (!path) {
      console.log(`[NEWSLETTER-ARCHIVE] ERROR: No path parameter provided [${requestId}]`);
      return NextResponse.json({
        success: false,
        message: 'Path parameter is required'
      }, { status: 400 });
    }

    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      console.log(`[NEWSLETTER-ARCHIVE] ERROR: No authentication session found [${requestId}]`);
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Clear cache if requested
    if (clearCache && cache[path]) {
      console.log(`[NEWSLETTER-ARCHIVE] Clearing cache for path: ${path} [${requestId}]`);
      delete cache[path];
    }

    // Check cache
    const now = Date.now();
    if (!forceFetch && cache[path] && cache[path].timestamp && (now - cache[path].timestamp < CACHE_DURATION)) {
      console.log(`[NEWSLETTER-ARCHIVE] Returning cached content for path: ${path} [${requestId}]`);
      return NextResponse.json({
        success: true,
        content: cache[path].content,
        path: path,
        source: 'cache',
        lastUpdated: new Date(cache[path].timestamp).toISOString()
      });
    }

    console.log(`[NEWSLETTER-ARCHIVE] Cache miss, fetching from SharePoint [${requestId}]`);

    try {
      // Get the file content using the getFileContent function from sharepointClient
      const fileContent = await getFileContent(path);

      console.log(`[NEWSLETTER-ARCHIVE] Successfully fetched file content (${fileContent.length} characters) [${requestId}]`);

      // Process the HTML content to make it safe for rendering
      let processedContent = fileContent;

      try {
        console.log(`[NEWSLETTER-ARCHIVE] Starting HTML processing [${requestId}]`);

        // Remove scripts and styles that might interfere
        processedContent = processedContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        processedContent = processedContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

        // Additional sanitization to prevent React rendering errors
        // Remove HTML comments
        processedContent = processedContent.replace(/<!--[\s\S]*?-->/g, '');

        // Ensure all tags are properly closed
        const openTags = processedContent.match(/<([a-z][a-z0-9]*)[^>]*(?<!\/)\s*>/gi) || [];
        const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];

        for (const tag of openTags) {
          const tagName = tag.match(/<([a-z][a-z0-9]*)/i)?.[1]?.toLowerCase();
          if (tagName && !selfClosingTags.includes(tagName)) {
            const closeTagRegex = new RegExp(`</${tagName}\\s*>`, 'i');
            if (!closeTagRegex.test(processedContent)) {
              // Add closing tag at the end if missing
              processedContent += `</${tagName}>`;
              console.log(`[NEWSLETTER-ARCHIVE] Added missing closing tag for: ${tagName} [${requestId}]`);
            }
          }
        }

        // Fix common HTML issues that might cause React errors
        // Convert deprecated tags to modern equivalents
        processedContent = processedContent.replace(/<font([^>]*)>([\s\S]*?)<\/font>/gi, '<span$1>$2</span>');
        processedContent = processedContent.replace(/<center>([\s\S]*?)<\/center>/gi, '<div style="text-align:center">$1</div>');

        // Ensure all attributes have values and are properly quoted
        processedContent = processedContent.replace(/(\s)([a-z][a-z0-9\-_]*)(?=[\s>])(?!\s*=)/gi, '$1$2=""');
        processedContent = processedContent.replace(/=([^\s"][^\s>]*)/gi, '="$1"');

        // Make all images responsive
        processedContent = processedContent.replace(/<img([^>]*?)>/gi, (match, attributes) => {
          // Remove width attribute and add responsive styling
          const cleanedAttrs = attributes.replace(/width="?\d+"?/gi, '');
          return `<img${cleanedAttrs} style="max-width: 100%; height: auto;">`;
        });

        console.log(`[NEWSLETTER-ARCHIVE] Completed HTML processing [${requestId}]`);
      } catch (error: any) {
        console.error(`[NEWSLETTER-ARCHIVE] Error during HTML processing: ${error.message} [${requestId}]`);
        // If HTML processing fails, use a simplified version of the content
        processedContent = `<div class="newsletter-fallback">
          <p>The newsletter content could not be properly processed. Here is a simplified version:</p>
          <div class="newsletter-text">${fileContent.replace(/<[^>]*>/g, ' ')}</div>
        </div>`;
      }

      // Update cache
      cache[path] = {
        content: processedContent,
        timestamp: now
      };

      return NextResponse.json({
        success: true,
        content: processedContent,
        path: path,
        source: 'sharepoint',
        lastUpdated: new Date().toISOString()
      });
    } catch (error: any) {
      console.error(`[NEWSLETTER-ARCHIVE] Error fetching from SharePoint: ${error.message} [${requestId}]`);

      // If we have cached content (even if expired), return it
      if (cache[path] && cache[path].content) {
        console.log(`[NEWSLETTER-ARCHIVE] Returning expired cache due to error [${requestId}]`);
        return NextResponse.json({
          success: true,
          content: cache[path].content,
          path: path,
          source: 'expired-cache',
          lastUpdated: cache[path].timestamp ? new Date(cache[path].timestamp).toISOString() : new Date().toISOString(),
          warning: 'Using cached version due to error'
        });
      }

      // If no cached content is available, return a user-friendly error message
      console.log(`[NEWSLETTER-ARCHIVE] No cache available, returning fallback content [${requestId}]`);

      // Determine the type of error for a more specific message
      let errorType = 'general';
      let userMessage = 'The newsletter archive is temporarily unavailable.';

      if (error.message.includes('itemNotFound') || error.message.includes('not found')) {
        errorType = 'not_found';
        userMessage = 'The requested newsletter file could not be found. It may have been moved or renamed.';
      } else if (error.message.includes('unauthorized') || error.message.includes('access denied') || error.message.includes('permission')) {
        errorType = 'permission';
        userMessage = 'You may not have permission to access this newsletter. Please contact IT support.';
      } else if (error.message.includes('timeout') || error.message.includes('network')) {
        errorType = 'network';
        userMessage = 'There was a network issue while fetching the newsletter. Please check your connection.';
      }

      // Create a user-friendly fallback content
      const fallbackContent = `
        <div style="padding: 30px; text-align: center; background: #f9f9f9; border-radius: 8px; font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <h2 style="color: #00539f; margin-bottom: 20px;">Newsletter Information</h2>

          <div style="background: white; border-radius: 6px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 15px;">
              ${userMessage}
            </p>

            <p style="color: #666; font-size: 14px;">
              Our team has been notified and is working to resolve this issue.
            </p>
          </div>

          <div style="margin: 30px 0; padding: 15px; background: #f0f7ff; border-radius: 6px; text-align: left;">
            <p style="color: #333; font-weight: bold; margin-bottom: 10px;">In the meantime, you can:</p>
            <ul style="color: #555; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Check the company announcements section for recent updates</li>
              <li style="margin-bottom: 8px;">Contact the communications team for the latest newsletter</li>
              <li style="margin-bottom: 8px;">Try refreshing the page or clearing your browser cache</li>
            </ul>
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
            Technical Information:<br>
            Error Type: ${errorType}<br>
            Request ID: ${requestId}<br>
            Path: ${path}
          </p>
        </div>
      `;

      return NextResponse.json({
        success: true, // Return success:true to prevent client-side error handling
        content: fallbackContent,
        path: path,
        source: 'fallback',
        errorType: errorType,
        errorMessage: error.message,
        requestId: requestId
      });
    }
  } catch (error: any) {
    console.error(`[NEWSLETTER-ARCHIVE] Unhandled error: ${error.message} [${requestId}]`);

    // Return a generic error message with fallback content
    const fallbackContent = `
      <div style="padding: 30px; text-align: center; background: #f9f9f9; border-radius: 8px; font-family: Arial, sans-serif;">
        <h2 style="color: #00539f; margin-bottom: 20px;">Newsletter Archive</h2>
        <p style="color: #333; font-size: 16px;">We're sorry, but we couldn't load the newsletter archive at this time.</p>
        <p style="color: #666; font-size: 14px; margin-top: 10px;">Please try again later or contact support if the issue persists.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          Request ID: ${requestId}
        </p>
      </div>
    `;

    return NextResponse.json({
      success: true, // Return success:true to prevent client-side error handling
      content: fallbackContent,
      path: path || 'unknown',
      source: 'error-fallback',
      errorMessage: error.message,
      requestId: requestId
    });
  }
}
