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
  console.log(`[NEWSLETTER-LIST] Request started [${requestId}]`);

  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
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

    console.log(`[NEWSLETTER-LIST] Cache miss, fetching from SharePoint [${requestId}]`);

    try {
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
        'Newsletter.html'
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
        throw new Error('Newsletter file not found in any of the expected locations');
      }

      console.log(`[NEWSLETTER-LIST] Successfully fetched newsletter, length: ${newsletterContent.length} [${requestId}]`);

      // Clean up the HTML content
      let processedContent = newsletterContent;

      // Remove scripts and styles that might interfere
      processedContent = processedContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      processedContent = processedContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

      // Extract body content if it's a full HTML document
      const bodyMatch = processedContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        processedContent = bodyMatch[1];
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
        return `<img${cleanedAttrs} style="max-width: 100%; height: auto;">`;
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

    return NextResponse.json({
      success: false,
      error: error.message,
      newsletter: {
        title: 'Newsletter Unavailable',
        content: `
          <div style="padding: 40px; text-align: center; background: #f5f5f5; border-radius: 8px;">
            <h2 style="color: #00539f;">CEO Newsletter</h2>
            <p style="color: #666;">The newsletter is temporarily unavailable.</p>
            <p style="color: #999; font-size: 14px; margin-top: 20px;">
              Error: ${error.message}<br>
              Request ID: ${requestId}
            </p>
          </div>
        `,
        lastUpdated: new Date().toISOString(),
        source: 'error'
      }
    });
  }
}
