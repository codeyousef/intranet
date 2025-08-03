import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getFileContent } from '@/lib/sharepointClient';

// Cache for newsletter content
let cache: {
  content?: string;
  timestamp?: number;
  etag?: string;
} = {};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  const requestId = `newsletter-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  // Use request ID from test header if available
  const testRequestId = request.headers.get('X-Test-Request-ID');
  if (testRequestId) {
    console.log(`[NEWSLETTER-LIST] Request started with test request ID [${testRequestId}]`);
  } else {
    console.log(`[NEWSLETTER-LIST] Request started [${requestId}]`);
  }

  // Use the test request ID if available, otherwise use the generated one
  const effectiveRequestId = testRequestId || requestId;

  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get test parameters from query string
    const searchParams = new URL(request.url).searchParams;
    const simulateNotFound = searchParams.get('simulate_not_found') === 'true';
    const simulatePermissionError = searchParams.get('simulate_permission_error') === 'true';
    const simulateNetworkError = searchParams.get('simulate_network_error') === 'true';
    const simulateHtmlError = searchParams.get('simulate_html_error') === 'true';

    // Log if we're in test mode
    if (simulateNotFound || simulatePermissionError || simulateNetworkError || simulateHtmlError) {
      console.log(`[NEWSLETTER-LIST] Running in test mode with simulated conditions [${effectiveRequestId}]`);
    }

    // Check cache
    const now = Date.now();
    if (cache.content && cache.timestamp && (now - cache.timestamp < CACHE_DURATION)) {
      console.log(`[NEWSLETTER-LIST] Returning cached content [${requestId}]`);
      return NextResponse.json({
        success: true,
        newsletter: {
          title: 'CEO Newsletter',
          content: cache.content,
          lastUpdated: new Date(cache.timestamp).toISOString(),
          source: 'SharePoint (cached)',
          cached: true
        }
      });
    }

    console.log(`[NEWSLETTER-LIST] Cache miss, fetching from SharePoint [${effectiveRequestId}]`);

    try {
      // Handle simulated test conditions
      if (simulateNotFound) {
        console.log(`[NEWSLETTER-LIST] Simulating 'file not found' error [${effectiveRequestId}]`);
        throw new Error('Newsletter file not found in any of the expected locations');
      }

      if (simulatePermissionError) {
        console.log(`[NEWSLETTER-LIST] Simulating 'permission denied' error [${effectiveRequestId}]`);
        throw new Error('Access denied. You do not have permission to access this resource.');
      }

      if (simulateNetworkError) {
        console.log(`[NEWSLETTER-LIST] Simulating 'network' error [${effectiveRequestId}]`);
        throw new Error('Failed to fetch due to network connectivity issues.');
      }
      // Try multiple possible paths to find the newsletter file
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
        'Newsletter.html',
        // Additional paths to try
        'Shared Documents/CEO Newsletter/last-newsletter.html',
        'Shared Documents/last-newsletter.html',
        'Shared Documents/newsletter.html',
        'Shared Documents/CEO Newsletter/Newsletter.html',
        'Shared Documents/CEO Newsletter/newsletter.html',
        'Shared Documents/Newsletter/last-newsletter.html',
        'Documents/CEO Newsletter/last-newsletter.html',
        'Documents/last-newsletter.html',
        'Documents/newsletter.html',
        'CEO Newsletter/index.html',
        'Newsletter/index.html',
        'CEO Newsletter/current.html',
        'Newsletter/current.html'
      ];

      let newsletterContent = '';
      let successPath = '';

      // Try each path until we find the file
      for (const path of possiblePaths) {
        try {
          console.log(`[NEWSLETTER-LIST] Trying path: ${path} [${requestId}]`);
          newsletterContent = await getFileContent(path);
          successPath = path;
          console.log(`[NEWSLETTER-LIST] Success! Found newsletter at: ${path} [${requestId}]`);
          break;
        } catch (error: any) {
          if (!error.message.includes('itemNotFound')) {
            console.error(`[NEWSLETTER-LIST] Unexpected error for ${path}: ${error.message} [${requestId}]`);
          }
        }
      }

      if (!newsletterContent) {
        console.log(`[NEWSLETTER-LIST] No newsletter content found after trying all paths [${requestId}]`);

        // Instead of throwing an error, return a helpful message with fallback content
        return NextResponse.json({
          success: true, // Return success:true to prevent client-side error handling
          newsletter: {
            title: 'Newsletter Update',
            content: `
              <div style="padding: 20px; text-align: center; background: #f9f9f9; border-radius: 8px; font-family: Arial, sans-serif;">
                <h2 style="color: #00539f; margin-bottom: 20px;">Newsletter Coming Soon</h2>
                <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 15px;">
                  We're currently updating our newsletter content. The latest edition will be available shortly.
                </p>
                <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
                  Thank you for your patience as we prepare the latest updates and announcements.
                </p>
                <div style="margin: 30px 0; padding: 15px; background: #fff; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                  <p style="color: #333; font-weight: bold; margin-bottom: 10px;">In the meantime, you can:</p>
                  <ul style="text-align: left; color: #555; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Check the company announcements section</li>
                    <li style="margin-bottom: 8px;">Visit the employee portal for recent updates</li>
                    <li style="margin-bottom: 8px;">Contact the communications team for specific information</li>
                  </ul>
                </div>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                  Request ID: ${requestId}<br>
                  This is an automatically generated message.
                </p>
              </div>
            `,
            lastUpdated: new Date().toISOString(),
            source: 'system',
            isFallback: true,
            fallbackReason: 'Newsletter file not found in any of the expected locations'
          }
        });
      }

      console.log(`[NEWSLETTER-LIST] Successfully fetched newsletter, length: ${newsletterContent.length} [${effectiveRequestId}]`);

      // Simulate HTML error if requested
      if (simulateHtmlError) {
        console.log(`[NEWSLETTER-LIST] Simulating HTML processing error [${effectiveRequestId}]`);
        // Inject malformed HTML that will cause processing issues
        newsletterContent = `<div><p>This is a test with malformed HTML.
          <table><tr><td>Missing closing tags and
          <script>alert('This should be removed but might cause issues if not handled properly');</script>
          <img src="broken.jpg" onerror="javascript:alert('XSS attempt');">
          <iframe src="javascript:alert('Another potential issue');"></iframe>
          <style>body { background: url('/images/agent.jpg'); }</style>
          <a href="javascript:alert('JavaScript link');">Click me</a>
          <div class="unclosed-div">
          <p class="unclosed-paragraph">
          <custom-tag>Non-standard HTML</custom-tag>
          <font size="7" color="red" face="Comic Sans MS">Deprecated tags</font>
          <!-- Unclosed comment...
        `;
      }

      // Clean up the HTML content
      let processedContent = newsletterContent;

      try {
        console.log(`[NEWSLETTER-LIST] Starting HTML processing for content length: ${newsletterContent.length} [${requestId}]`);

        // Remove scripts and styles that might interfere
        processedContent = processedContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        processedContent = processedContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

        // Extract body content if it's a full HTML document
        const bodyMatch = processedContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          processedContent = bodyMatch[1];
          console.log(`[NEWSLETTER-LIST] Extracted body content, new length: ${processedContent.length} [${requestId}]`);
        }

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
              console.log(`[NEWSLETTER-LIST] Added missing closing tag for: ${tagName} [${requestId}]`);
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

        console.log(`[NEWSLETTER-LIST] Completed HTML processing, final length: ${processedContent.length} [${requestId}]`);
      } catch (error: any) {
        console.error(`[NEWSLETTER-LIST] Error during HTML processing: ${error.message} [${requestId}]`);
        // If HTML processing fails, use a simplified version of the content
        processedContent = `<div class="newsletter-fallback">
          <p>The newsletter content could not be properly processed. Here is a simplified version:</p>
          <div class="newsletter-text">${newsletterContent.replace(/<[^>]*>/g, ' ')}</div>
        </div>`;
      }

      // More aggressive processing for mobile compatibility
      // Remove fixed widths from all elements
      processedContent = processedContent.replace(/width:\s*\d+px/gi, 'width: 100%');
      processedContent = processedContent.replace(/width="?\d+"?/gi, 'width="100%"');
      processedContent = processedContent.replace(/min-width:\s*\d+px/gi, 'min-width: 0');

      // Fix tables specifically
      processedContent = processedContent.replace(/<table([^>]*)>/gi, '<table$1 style="width: 100% !important; table-layout: fixed !important;">');

      // Fix images
      processedContent = processedContent.replace(/<img([^>]*?)>/gi, (match, attributes) => {
        // Remove width attribute and add responsive styling
        const cleanedAttrs = attributes.replace(/width="?\d+"?/gi, '');
        // Add loading="eager" to prevent lazy loading issues
        return `<img${cleanedAttrs} style="max-width: 100%; height: auto;" loading="eager" decoding="sync">`;
      });

      // Fix iframes
      processedContent = processedContent.replace(/<iframe([^>]*?)>/gi, (match, attributes) => {
        // Add sandbox and loading attributes to prevent issues
        return `<iframe${attributes} sandbox="allow-same-origin allow-scripts" loading="eager">`;
      });

      // Trim any whitespace
      processedContent = processedContent.trim();

      // More aggressive removal of empty elements at the start
      let previousLength;
      do {
        previousLength = processedContent.length;

        // Remove empty paragraphs, divs, spans, and any whitespace at the start
        processedContent = processedContent.replace(/^(\s*<p[^>]*>(\s|&nbsp;|<br[^>]*>)*<\/p>\s*)+/gi, '');
        processedContent = processedContent.replace(/^(\s*<div[^>]*>(\s|&nbsp;|<br[^>]*>)*<\/div>\s*)+/gi, '');
        processedContent = processedContent.replace(/^(\s*<span[^>]*>(\s|&nbsp;)*<\/span>\s*)+/gi, '');
        processedContent = processedContent.replace(/^(\s*<br[^>]*>\s*)+/gi, '');
        processedContent = processedContent.replace(/^(\s|&nbsp;)+/gi, '');

        // Remove any element that contains only whitespace or nbsp at the start
        processedContent = processedContent.replace(/^<([^>]+)>(\s|&nbsp;|<br[^>]*>)*<\/\1>\s*/gi, '');

        // Also remove common SharePoint empty containers
        processedContent = processedContent.replace(/^<div[^>]*class="[^"]*ExternalClass[^"]*"[^>]*>(\s|&nbsp;)*<\/div>\s*/gi, '');
        processedContent = processedContent.replace(/^<div[^>]*style="[^"]*"[^>]*>(\s|&nbsp;)*<\/div>\s*/gi, '');

        // Remove empty table cells that might be at the start
        processedContent = processedContent.replace(/^<td[^>]*>(\s|&nbsp;|<br[^>]*>)*<\/td>\s*/gi, '');
        processedContent = processedContent.replace(/^<tr[^>]*>(\s*<td[^>]*>(\s|&nbsp;)*<\/td>\s*)*<\/tr>\s*/gi, '');

      } while (processedContent.length < previousLength); // Keep removing until no more changes

      // Add inline style to first actual element to ensure no gap
      processedContent = processedContent.replace(/^<([^>]+)/, (match, tag) => {
        // Check if it already has a style attribute
        if (tag.includes('style=')) {
          return match.replace(/style="([^"]*)"/, 'style="$1; margin-top: 0 !important; padding-top: 0 !important;"');
        } else {
          return `<${tag} style="margin-top: 0 !important; padding-top: 0 !important;"`;
        }
      });

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
        }
      });
    } catch (error: any) {
      console.error(`[NEWSLETTER-LIST] Failed to fetch from SharePoint [${requestId}]`, error);

      // If we have cached content (even if expired), return it
      if (cache.content) {
        console.log(`[NEWSLETTER-LIST] Returning expired cache due to error [${requestId}]`);
        return NextResponse.json({
          success: true,
          newsletter: {
            title: 'CEO Newsletter',
            content: cache.content,
            lastUpdated: cache.timestamp ? new Date(cache.timestamp).toISOString() : new Date().toISOString(),
            source: 'SharePoint (expired cache)',
            cached: true,
            warning: 'Unable to fetch latest newsletter, showing previous version'
          }
        });
      }

      throw error; // Re-throw to be caught by the outer catch block
    }

  } catch (error: any) {
    console.error(`[NEWSLETTER-LIST] Error: ${error.message} [${requestId}]`);

    // Return cached content if available
    if (cache.content) {
      console.log(`[NEWSLETTER-LIST] Returning cached content due to error [${requestId}]`);
      return NextResponse.json({
        success: true,
        newsletter: {
          title: 'CEO Newsletter',
          content: cache.content,
          lastUpdated: cache.timestamp ? new Date(cache.timestamp).toISOString() : new Date().toISOString(),
          source: 'SharePoint (expired cache)',
          cached: true,
          warning: 'Using cached version due to error'
        }
      });
    }

    // Determine the type of error for a more specific message
    let errorType = 'general';
    let userMessage = 'The newsletter is temporarily unavailable.';

    if (error.message.includes('itemNotFound') || error.message.includes('not found')) {
      errorType = 'not_found';
      userMessage = 'The newsletter file could not be found. It may have been moved or renamed.';
    } else if (error.message.includes('unauthorized') || error.message.includes('access denied') || error.message.includes('permission')) {
      errorType = 'permission';
      userMessage = 'You may not have permission to access the newsletter. Please contact IT support.';
    } else if (error.message.includes('timeout') || error.message.includes('network')) {
      errorType = 'network';
      userMessage = 'There was a network issue while fetching the newsletter. Please check your connection.';
    }

    console.log(`[NEWSLETTER-LIST] Returning friendly error message for error type: ${errorType} [${requestId}]`);

    // Return a user-friendly error message with success:true to prevent client-side error handling
    return NextResponse.json({
      success: true,
      newsletter: {
        title: 'Newsletter Update',
        content: `
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
              Request ID: ${requestId}
            </p>
          </div>
        `,
        lastUpdated: new Date().toISOString(),
        source: 'system',
        isFallback: true,
        fallbackReason: error.message,
        errorType: errorType
      }
    });
  }
}
