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

  // 🚨 ULTRA-CRITICAL DEBUGGING - Log everything at the start
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] API ENTRY POINT - ${new Date().toISOString()}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Request ID: ${effectiveRequestId}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Method: ${request.method}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] URL: ${request.url}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] User-Agent: ${request.headers.get('user-agent')}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Authorization: ${request.headers.get('authorization') ? 'Present' : 'Missing'}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Environment: ${process.env.NODE_ENV}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] SharePoint Site: ${process.env.SHAREPOINT_SITE_URL || 'Not configured'}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] SharePoint Client ID: ${process.env.SHAREPOINT_CLIENT_ID ? 'Present' : 'Missing'}`);
  console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Timestamp: ${new Date().toISOString()}`);

  // Log comprehensive request details
  console.log(`🔍 [NEWSLETTER-API-DEBUG] Request Details [${effectiveRequestId}]`, {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    timestamp: new Date().toISOString(),
    headers: {
      authorization: request.headers.get('authorization') ? 'Present' : 'Missing',
      contentType: request.headers.get('content-type'),
      accept: request.headers.get('accept'),
      cookie: request.headers.get('cookie') ? 'Present' : 'Missing'
    }
  });

  try {
    console.log(`🔐 [NEWSLETTER-API-DEBUG] Starting authentication check [${effectiveRequestId}]`);
    const session = await getAuthSession();
    if (!session) {
      console.error(`❌ [NEWSLETTER-API-DEBUG] Authentication failed - no session [${effectiveRequestId}]`);
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log(`✅ [NEWSLETTER-API-DEBUG] Authentication successful [${effectiveRequestId}]`, {
      userEmail: session.user?.email || 'unknown',
      userName: session.user?.name || 'unknown',
      sessionExpires: session.expires || 'unknown'
    });

    // Get test parameters from query string
    const searchParams = new URL(request.url).searchParams;
    const simulateNotFound = searchParams.get('simulate_not_found') === 'true';
    const simulatePermissionError = searchParams.get('simulate_permission_error') === 'true';
    const simulateNetworkError = searchParams.get('simulate_network_error') === 'true';
    const simulateHtmlError = searchParams.get('simulate_html_error') === 'true';
    const forceFetch = searchParams.get('force_fetch') === 'true';
    const clearCache = searchParams.get('clear_cache') === 'true';

    // Log comprehensive query parameters
    console.log(`📋 [NEWSLETTER-API-DEBUG] Query Parameters [${effectiveRequestId}]`, {
      simulateNotFound,
      simulatePermissionError,
      simulateNetworkError,
      simulateHtmlError,
      forceFetch,
      clearCache,
      allParams: Object.fromEntries(searchParams.entries())
    });

    // Log if we're in test mode
    if (simulateNotFound || simulatePermissionError || simulateNetworkError || simulateHtmlError) {
      console.log(`⚠️ [NEWSLETTER-API-DEBUG] Running in test mode with simulated conditions [${effectiveRequestId}]`);
    }

    // Check cache
    const now = Date.now();
    const cacheAge = cache.timestamp ? now - cache.timestamp : null;
    const isCacheValid = cache.content && cache.timestamp && (cacheAge! < CACHE_DURATION);
    const shouldUseCacheAnyway = isCacheValid && !forceFetch && !clearCache;

    console.log(`💾 [NEWSLETTER-API-DEBUG] Cache Status Check [${effectiveRequestId}]`, {
      hasCachedContent: !!cache.content,
      cacheTimestamp: cache.timestamp ? new Date(cache.timestamp).toISOString() : 'none',
      cacheAge: cacheAge ? `${Math.round(cacheAge / 1000)} seconds` : 'none',
      cacheDuration: `${CACHE_DURATION / 1000} seconds`,
      isCacheValid,
      forceFetch,
      clearCache,
      shouldUseCacheAnyway
    });

    if (clearCache && cache.content) {
      console.log(`🗑️ [NEWSLETTER-API-DEBUG] Clearing cache as requested [${effectiveRequestId}]`);
      cache = {};
    }

    if (shouldUseCacheAnyway) {
      console.log(`✅ [NEWSLETTER-API-DEBUG] Returning cached content [${effectiveRequestId}]`, {
        contentLength: cache.content?.length || 0,
        cacheAge: `${Math.round(cacheAge! / 1000)} seconds`
      });
      return NextResponse.json({
        success: true,
        newsletter: {
          title: 'CEO Newsletter',
          content: cache.content,
          lastUpdated: new Date(cache.timestamp!).toISOString(),
          source: 'SharePoint (cached)',
          cached: true
        }
      });
    }

    console.log(`🔄 [NEWSLETTER-API-DEBUG] Cache miss or forced fetch, fetching from SharePoint [${effectiveRequestId}]`, {
      reason: !cache.content ? 'no cached content' : 
              !cache.timestamp ? 'no cache timestamp' : 
              cacheAge! >= CACHE_DURATION ? 'cache expired' : 
              forceFetch ? 'force fetch requested' : 
              clearCache ? 'cache cleared' : 'unknown'
    });

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
        // Root level paths (like flight data)
        'newsletter.html',
        'last-newsletter.html',
        'CEO-Newsletter.html',
        'ceo-newsletter.html',
        'Newsletter.html',
        'LastNewsletter.html',
        'latest-newsletter.html',
        'current-newsletter.html',
        'CEO Newsletter.html',
        'CEO newsletter.html',
        'ceo Newsletter.html',
        
        // CEO Newsletter folder paths (based on browser link)
        'CEO Newsletter/last-newsletter.html',
        'CEO Newsletter/Newsletter.html',
        'CEO Newsletter/newsletter.html',
        'CEO Newsletter/Last Newsletter.html',
        'CEO Newsletter/CEO Newsletter.html',
        'CEO Newsletter/index.html',
        'CEO Newsletter/current.html',
        // Try with Forms path
        'CEO Newsletter/Forms/last-newsletter.html',
        'CEO Newsletter/Forms/Newsletter.html',
        
        // Newsletter folder paths
        'Newsletter/last-newsletter.html',
        'Newsletter/newsletter.html',
        'Newsletter/index.html',
        'Newsletter/current.html',
        
        // Shared Documents paths
        'Shared Documents/CEO Newsletter/last-newsletter.html',
        'Shared Documents/last-newsletter.html',
        'Shared Documents/newsletter.html',
        'Shared Documents/CEO Newsletter/Newsletter.html',
        'Shared Documents/CEO Newsletter/newsletter.html',
        'Shared Documents/Newsletter/last-newsletter.html',
        
        // Documents paths
        'Documents/CEO Newsletter/last-newsletter.html',
        'Documents/last-newsletter.html',
        'Documents/newsletter.html',
        
        // Try without extension
        'newsletter',
        'Newsletter',
        'CEO Newsletter',
        'last-newsletter',
        'LastNewsletter'
      ];

      let newsletterContent = '';
      let successPath = '';

      // Try each path until we find the file
      console.log(`📁 [NEWSLETTER-API-DEBUG] Starting SharePoint file search [${effectiveRequestId}]`, {
        totalPaths: possiblePaths.length,
        searchStartTime: new Date().toISOString()
      });

      for (let i = 0; i < possiblePaths.length; i++) {
        const path = possiblePaths[i];
        const pathAttemptStart = Date.now();
        try {
          console.log(`🔍 [NEWSLETTER-API-DEBUG] Attempting path ${i + 1}/${possiblePaths.length}: ${path} [${effectiveRequestId}]`);
          console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] About to call getFileContent for: ${path} [${effectiveRequestId}]`);
          
          // Log environment variables to ensure SharePoint is configured
          if (i === 0) { // Only log once
            console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] SharePoint Config Check:`, {
              SHAREPOINT_SITE_URL: process.env.SHAREPOINT_SITE_URL || 'NOT SET',
              SHAREPOINT_CLIENT_ID: process.env.SHAREPOINT_CLIENT_ID ? 'SET' : 'NOT SET',
              SHAREPOINT_CLIENT_SECRET: process.env.SHAREPOINT_CLIENT_SECRET ? 'SET' : 'NOT SET',
              AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID ? 'SET' : 'NOT SET',
              AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET ? 'SET' : 'NOT SET',
              AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID || 'NOT SET'
            });
          }

          newsletterContent = await getFileContent(path);
          successPath = path;
          const pathAttemptDuration = Date.now() - pathAttemptStart;

          console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] SUCCESS! getFileContent returned content for: ${path} [${effectiveRequestId}]`);
          console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Content length: ${newsletterContent.length}`);
          console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Content preview: ${newsletterContent.substring(0, 100).replace(/\s+/g, ' ').trim()}`);

          console.log(`✅ [NEWSLETTER-API-DEBUG] SUCCESS! Found newsletter at: ${path} [${effectiveRequestId}]`, {
            pathIndex: i + 1,
            totalPaths: possiblePaths.length,
            attemptDuration: `${pathAttemptDuration}ms`,
            contentLength: newsletterContent.length,
            contentPreview: newsletterContent.substring(0, 200).replace(/\s+/g, ' ').trim()
          });
          break;
        } catch (error: any) {
          const pathAttemptDuration = Date.now() - pathAttemptStart;

          console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] getFileContent FAILED for: ${path} [${effectiveRequestId}]`);
          console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Error message: ${error.message}`);
          console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Error type: ${error.name || 'Unknown'}`);
          console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Error code: ${error.code || 'None'}`);
          console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Full error object:`, JSON.stringify(error, null, 2));
          console.error(`🚨 [NEWSLETTER-API-ULTRA-CRITICAL] Error stack:`, error.stack);

          if (error.message.includes('itemNotFound')) {
            console.log(`❌ [NEWSLETTER-API-DEBUG] Path not found: ${path} [${effectiveRequestId}]`, {
              pathIndex: i + 1,
              totalPaths: possiblePaths.length,
              attemptDuration: `${pathAttemptDuration}ms`,
              errorType: 'itemNotFound'
            });
          } else {
            console.error(`⚠️ [NEWSLETTER-API-DEBUG] Unexpected error for ${path} [${effectiveRequestId}]`, {
              pathIndex: i + 1,
              totalPaths: possiblePaths.length,
              attemptDuration: `${pathAttemptDuration}ms`,
              errorMessage: error.message,
              errorType: error.name || 'Unknown',
              errorStack: error.stack
            });
          }
        }
      }

      if (!newsletterContent) {
        console.error(`❌ [NEWSLETTER-API-DEBUG] No newsletter content found after trying all paths [${effectiveRequestId}]`, {
          totalPathsAttempted: possiblePaths.length,
          searchDuration: `${Date.now() - Date.now()}ms`,
          allPathsAttempted: possiblePaths
        });

        // 🚨 CRITICAL FIX: Return success:false to trigger proper error handling on frontend
        // This prevents system fallback content from being cached as valid content
        console.error(`🚨 [NEWSLETTER-API-CRITICAL] Returning error to prevent caching of fallback content [${effectiveRequestId}]`);

        return NextResponse.json({
          success: false,
          error: 'Newsletter file not found in any of the expected locations',
          errorType: 'not_found',
          details: 'All possible newsletter file paths have been checked',
          searchedPaths: possiblePaths,
          fallbackContent: {
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
                  Request ID: ${effectiveRequestId}<br>
                  This is an automatically generated message.
                </p>
              </div>
            `,
            lastUpdated: new Date().toISOString(),
            source: 'system',
            isFallback: true,
            fallbackReason: 'Newsletter file not found in any of the expected locations'
          }
        }, { status: 404 });
      }

      console.log(`🎉 [NEWSLETTER-API-DEBUG] Successfully fetched newsletter content [${effectiveRequestId}]`, {
        contentLength: newsletterContent.length,
        successPath: successPath,
        contentType: newsletterContent.includes('<!DOCTYPE') || newsletterContent.includes('<html') ? 'Full HTML Document' : 'HTML Fragment',
        hasImages: newsletterContent.includes('<img'),
        hasTables: newsletterContent.includes('<table'),
        hasStyles: newsletterContent.includes('<style') || newsletterContent.includes('style='),
        hasScripts: newsletterContent.includes('<script'),
        contentPreview: newsletterContent.substring(0, 300).replace(/\s+/g, ' ').trim()
      });

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
        console.log(`🔧 [NEWSLETTER-API-DEBUG] Starting HTML processing [${effectiveRequestId}]`, {
          originalContentLength: newsletterContent.length,
          processingStartTime: new Date().toISOString()
        });

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

        // Fix self-closing tags for React compatibility (React expects XHTML format)
        const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];

        for (const tagName of selfClosingTags) {
          // Convert HTML-style self-closing tags to XHTML-style for React
          const htmlStyleRegex = new RegExp(`<${tagName}([^>]*?)(?<!/)>`, 'gi');
          processedContent = processedContent.replace(htmlStyleRegex, (match, attributes) => {
            // If it already ends with />, leave it as is
            if (match.endsWith('/>')) {
              return match;
            }
            // Convert to XHTML-style self-closing tag
            return `<${tagName}${attributes} />`;
          });
        }

        // Ensure all non-self-closing tags are properly closed
        const openTags = processedContent.match(/<([a-z][a-z0-9]*)[^>]*(?<!\/)\s*>/gi) || [];

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

        console.log(`✅ [NEWSLETTER-API-DEBUG] Completed HTML processing [${effectiveRequestId}]`, {
          originalLength: newsletterContent.length,
          finalLength: processedContent.length,
          reductionPercentage: Math.round(((newsletterContent.length - processedContent.length) / newsletterContent.length) * 100),
          processingSteps: {
            scriptsRemoved: !processedContent.includes('<script'),
            stylesRemoved: !processedContent.includes('<style'),
            bodyExtracted: newsletterContent.includes('<body') && !processedContent.includes('<body'),
            commentsRemoved: !processedContent.includes('<!--'),
            tagsFixed: true,
            mobileOptimized: true
          }
        });
      } catch (error: any) {
        console.error(`❌ [NEWSLETTER-API-DEBUG] Error during HTML processing [${effectiveRequestId}]`, {
          errorMessage: error.message,
          errorType: error.name || 'Unknown',
          errorStack: error.stack,
          originalContentLength: newsletterContent.length,
          partialProcessedLength: processedContent.length,
          fallbackStrategy: 'simplified content'
        });
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
      const cacheUpdateTime = Date.now();
      cache = {
        content: processedContent,
        timestamp: cacheUpdateTime
      };

      console.log(`💾 [NEWSLETTER-API-DEBUG] Cache updated [${effectiveRequestId}]`, {
        contentLength: processedContent.length,
        cacheTimestamp: new Date(cacheUpdateTime).toISOString(),
        successPath: successPath
      });

      const responseData = {
        success: true,
        newsletter: {
          title: 'CEO Newsletter',
          content: processedContent,
          lastUpdated: new Date().toISOString(),
          source: `SharePoint (fresh) - ${successPath}`,
          cached: false
        }
      };

      console.log(`📤 [NEWSLETTER-API-DEBUG] Sending successful response [${effectiveRequestId}]`, {
        responseSize: JSON.stringify(responseData).length,
        newsletterTitle: responseData.newsletter.title,
        contentLength: responseData.newsletter.content.length,
        source: responseData.newsletter.source,
        cached: responseData.newsletter.cached
      });

      return NextResponse.json(responseData);
    } catch (error: any) {
      console.error(`❌ [NEWSLETTER-API-DEBUG] Failed to fetch from SharePoint [${effectiveRequestId}]`, {
        errorMessage: error.message,
        errorType: error.name || 'Unknown',
        errorStack: error.stack,
        hasExpiredCache: !!cache.content,
        cacheAge: cache.timestamp ? `${Math.round((Date.now() - cache.timestamp) / 1000)} seconds` : 'none'
      });

      // If we have cached content (even if expired), return it
      if (cache.content) {
        console.log(`🔄 [NEWSLETTER-API-DEBUG] Returning expired cache due to SharePoint error [${effectiveRequestId}]`, {
          cacheAge: cache.timestamp ? `${Math.round((Date.now() - cache.timestamp) / 1000)} seconds` : 'unknown',
          contentLength: cache.content.length,
          fallbackStrategy: 'expired cache'
        });
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

      console.log(`⚠️ [NEWSLETTER-API-DEBUG] No cache available, re-throwing error [${effectiveRequestId}]`);
      throw error; // Re-throw to be caught by the outer catch block
    }

  } catch (error: any) {
    console.error(`💥 [NEWSLETTER-API-DEBUG] Final error handler triggered [${effectiveRequestId}]`, {
      errorMessage: error.message,
      errorType: error.name || 'Unknown',
      errorStack: error.stack,
      hasAnyCache: !!cache.content,
      requestDuration: `${Date.now() - parseInt(effectiveRequestId.split('-')[1])}ms`
    });

    // Return cached content if available
    if (cache.content) {
      console.log(`🔄 [NEWSLETTER-API-DEBUG] Final fallback: returning any cached content [${effectiveRequestId}]`, {
        cacheAge: cache.timestamp ? `${Math.round((Date.now() - cache.timestamp) / 1000)} seconds` : 'unknown',
        contentLength: cache.content.length,
        fallbackStrategy: 'any available cache'
      });
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

    console.log(`🚨 [NEWSLETTER-API-DEBUG] Generating user-friendly error response [${effectiveRequestId}]`, {
      errorType: errorType,
      userMessage: userMessage,
      hasCache: !!cache.content,
      fallbackStrategy: 'user-friendly error message'
    });

    // Return error with fallback content to prevent caching of system-generated content
    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: errorType,
      details: userMessage,
      fallbackContent: {
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
              Request ID: ${effectiveRequestId}
            </p>
          </div>
        `,
        lastUpdated: new Date().toISOString(),
        source: 'system',
        isFallback: true,
        fallbackReason: error.message
      }
    });
  }
}
