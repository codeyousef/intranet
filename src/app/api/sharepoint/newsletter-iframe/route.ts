// app/api/sharepoint/newsletter-iframe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

// Enhanced logging system for troubleshooting
const logger = {
  // Always log important information
  info: (message: string, data?: any) => {
    console.log(`[NEWSLETTER-INFO] ${message}`, data ? data : '');
  },

  // Log critical information that should always be visible
  critical: (message: string, data?: any) => {
    console.log(`[NEWSLETTER-CRITICAL] ${message}`, data ? data : '');
  },

  // Log warnings that might indicate potential issues
  warn: (message: string, data?: any) => {
    console.warn(`[NEWSLETTER-WARN] ${message}`, data ? data : '');
  },

  // Log errors with detailed information
  error: (message: string, data?: any) => {
    console.error(`[NEWSLETTER-ERROR] ${message}`, data ? data : '');
  },

  // Log detailed debug information
  debug: (message: string, data?: any) => {
    console.log(`[NEWSLETTER-DEBUG] ${message}`, data ? data : '');
  },

  // Log API request details
  request: (method: string, url: string, headers?: any, body?: any) => {
    console.log(`[NEWSLETTER-REQUEST] ${method} ${url}`, { headers, body });
  },

  // Log API response details
  response: (url: string, status: number, headers?: any, body?: any) => {
    console.log(`[NEWSLETTER-RESPONSE] ${url} - Status: ${status}`, { headers, body });
  }
};

/**
 * Utility function to retry a fetch operation up to a specified number of times
 * Retries on both network errors and certain HTTP error status codes
 */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 3) {
  let lastError;
  let lastResponse;

  // Create a sanitized version of the options for logging (to avoid logging sensitive data)
  const sanitizedOptions = {
    method: options.method || 'GET',
    headers: (options.headers ? { ...options.headers } : {}) as Record<string, string>,
    hasBody: !!options.body
  };

  // Mask authorization header if present
  if (sanitizedOptions.headers && 'Authorization' in sanitizedOptions.headers) {
    sanitizedOptions.headers['Authorization'] = 'Bearer [TOKEN REDACTED]';
  }

  // Log the request details
  logger.request(
    sanitizedOptions.method, 
    url, 
    sanitizedOptions.headers,
    sanitizedOptions.hasBody ? 'Request body present but not logged' : undefined
  );

  const startTime = Date.now();
  logger.debug(`Starting fetch with retry (max attempts: ${maxRetries})`, { url });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Fetch attempt ${attempt}/${maxRetries} for ${url}`);
      const attemptStartTime = Date.now();
      const response = await fetch(url, options);
      const attemptDuration = Date.now() - attemptStartTime;

      // Log response details
      logger.response(
        url, 
        response.status, 
        {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          cacheControl: response.headers.get('cache-control')
        },
        `Response received in ${attemptDuration}ms`
      );

      // Check if response is successful or if it's a 404 (which we don't want to retry)
      if (response.ok || response.status === 404) {
        if (response.ok) {
          logger.debug(`Fetch successful for ${url}`, { status: response.status, attempt });
        } else {
          logger.warn(`Received 404 for ${url} - not retrying`, { attempt });
        }
        return response;
      }

      // For other error status codes (500, 429, etc.), we'll retry
      lastResponse = response;
      logger.warn(`Fetch attempt ${attempt}/${maxRetries} failed for ${url}`, { 
        status: response.status, 
        statusText: response.statusText,
        duration: attemptDuration
      });

      // Only wait if we're going to retry
      if (attempt < maxRetries) {
        const backoffTime = 1000 * attempt;
        logger.debug(`Backing off for ${backoffTime}ms before retry ${attempt + 1}`);
        // Exponential backoff: wait longer between each retry
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    } catch (error: any) {
      lastError = error;
      logger.error(`Fetch attempt ${attempt}/${maxRetries} failed with network error`, { 
        url, 
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack
      });

      // Only wait if we're going to retry
      if (attempt < maxRetries) {
        const backoffTime = 1000 * attempt;
        logger.debug(`Backing off for ${backoffTime}ms before retry ${attempt + 1}`);
        // Exponential backoff: wait longer between each retry
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }

  const totalDuration = Date.now() - startTime;

  // If we get here, all retries failed
  if (lastResponse) {
    logger.error(`All ${maxRetries} fetch attempts failed for ${url}`, { 
      finalStatus: lastResponse.status,
      totalDuration
    });
    return lastResponse; // Return the last error response
  }

  logger.error(`All ${maxRetries} fetch attempts failed with network errors for ${url}`, {
    totalDuration,
    finalError: lastError ? {
      name: lastError.name,
      message: lastError.message
    } : 'Unknown error'
  });

  throw lastError || new Error(`All fetch attempts failed for ${url}`);
}

/**
 * Get Graph API token - THIS WORKS based on your test results
 */
async function getGraphToken() {
  logger.info('Starting Graph API token acquisition process');

  // Check if environment variables are set
  if (!process.env.AZURE_AD_TENANT_ID) {
    logger.error('AZURE_AD_TENANT_ID environment variable is not set');
    throw new Error('AZURE_AD_TENANT_ID environment variable is not set');
  }

  if (!process.env.AZURE_AD_CLIENT_ID) {
    logger.error('AZURE_AD_CLIENT_ID environment variable is not set');
    throw new Error('AZURE_AD_CLIENT_ID environment variable is not set');
  }

  if (!process.env.AZURE_AD_CLIENT_SECRET) {
    logger.error('AZURE_AD_CLIENT_SECRET environment variable is not set');
    throw new Error('AZURE_AD_CLIENT_SECRET environment variable is not set');
  }

  const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;
  logger.debug('Preparing to request Graph API token', { 
    tokenUrl,
    tenantId: process.env.AZURE_AD_TENANT_ID,
    clientId: process.env.AZURE_AD_CLIENT_ID?.substring(0, 5) + '...' // Log only first few chars for security
  });

  const startTime = Date.now();

  try {
    const response = await fetchWithRetry(
        tokenUrl,
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

    if (!response.ok) {
      const error = await response.text();
      logger.error('Graph token acquisition failed', { 
        status: response.status, 
        statusText: response.statusText,
        error,
        duration: Date.now() - startTime
      });
      throw new Error(`Graph token acquisition failed: ${error}`);
    }

    const data = await response.json();

    // Check if we got an access token
    if (!data.access_token) {
      logger.error('Graph token response did not contain an access token', { 
        responseKeys: Object.keys(data),
        duration: Date.now() - startTime
      });
      throw new Error('Graph token response did not contain an access token');
    }

    const tokenLength = data.access_token.length;
    const expiresIn = data.expires_in;

    logger.info('Successfully acquired Graph API token', { 
      tokenLength,
      expiresIn,
      tokenType: data.token_type,
      duration: Date.now() - startTime
    });

    return data.access_token;
  } catch (error: any) {
    // This catch block handles any errors not caught in the try block
    logger.error('Unexpected error during Graph token acquisition', {
      errorMessage: error.message,
      stack: error.stack,
      duration: Date.now() - startTime
    });
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const requestId = `newsletter-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  logger.critical(`=== Newsletter API Request Start [${requestId}] ===`);

  // Log request details
  logger.info(`Newsletter API request received [${requestId}]`, {
    url: request.url,
    method: request.method,
    headers: {
      userAgent: request.headers.get('user-agent'),
      accept: request.headers.get('accept'),
      referer: request.headers.get('referer')
    }
  });

  try {
    // Check authentication
    logger.debug(`Checking authentication [${requestId}]`);
    const session = await getAuthSession();
    
    if (!session || !session.accessToken) {
      logger.warn(`Authentication check failed - no session or access token [${requestId}]`, {
        hasSession: !!session,
        hasAccessToken: !!(session?.accessToken)
      });
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        details: 'No valid session found',
        requestId: requestId
      }, { status: 401 });
    }

    logger.info(`Authentication successful [${requestId}]`, {
      userEmail: session.user?.email,
      tokenLength: session.accessToken?.length
    });

    // Check for force fetch parameter
    const { searchParams } = new URL(request.url);
    const forceFetch = searchParams.get('force_fetch') === 'true';
    
    if (forceFetch) {
      logger.info(`Force fetch requested [${requestId}]`);
    }

    // The newsletter HTML URL - direct link to the newsletter
    const newsletterUrl = 'https://flyadeal.sharepoint.com/sites/Thelounge/CEO%20Newsletter/last-newsletter.html';
    logger.info(`Newsletter URL configured [${requestId}]`, { newsletterUrl });

    let htmlContent = '';
    let fetchMethod = '';
    let sharePointUrl = newsletterUrl;

    // Method 1: Try SharePoint REST API with delegated token
    try {
      logger.debug(`Attempting Method 1: SharePoint REST API with delegated token [${requestId}]`);
      
      // Construct the server-relative URL from the full URL
      const url = new URL(newsletterUrl);
      const serverRelativeUrl = decodeURIComponent(url.pathname);
      
      const restApiUrl = `https://flyadeal.sharepoint.com/_api/web/GetFileByServerRelativeUrl('${serverRelativeUrl}')/$value`;
      
      logger.debug(`REST API URL: ${restApiUrl} [${requestId}]`);
      
      const restResponse = await fetchWithRetry(restApiUrl, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'text/html, */*',
        },
      });

      if (restResponse.ok) {
        htmlContent = await restResponse.text();
        fetchMethod = 'SharePoint REST API (Delegated)';
        logger.info(`Successfully fetched newsletter using SharePoint REST API [${requestId}]`, {
          contentLength: htmlContent.length,
          method: fetchMethod
        });
      } else {
        const errorText = await restResponse.text();
        logger.warn(`SharePoint REST API failed [${requestId}]`, {
          status: restResponse.status,
          statusText: restResponse.statusText,
          error: errorText.substring(0, 200) // Log only first 200 chars
        });
      }
    } catch (error: any) {
      logger.error(`Error with SharePoint REST API [${requestId}]`, {
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack?.substring(0, 500) // Log only first 500 chars of stack
      });
    }

    // Method 2: Try Graph API with application token
    if (!htmlContent) {
      try {
        logger.debug(`Attempting Method 2: Graph API with application token [${requestId}]`);
        
        const graphToken = await getGraphToken();
        logger.debug(`Graph token acquired, length: ${graphToken.length} [${requestId}]`);
        
        // List of possible paths to try based on the URL structure
        const graphPaths = [
          "/sites/flyadeal.sharepoint.com,flyadeal.sharepoint.com:/sites/Thelounge:/drive/root:/CEO Newsletter/last-newsletter.html:/content",
          "/sites/flyadeal.sharepoint.com:/sites/Thelounge:/drive/root:/CEO Newsletter/last-newsletter.html:/content",
          "/sites/Thelounge/drive/root:/CEO Newsletter/last-newsletter.html:/content",
          "/sites/root/drive/root:/sites/Thelounge/CEO Newsletter/last-newsletter.html:/content"
        ];

        logger.debug(`Will try ${graphPaths.length} different Graph API paths [${requestId}]`);

        for (const graphPath of graphPaths) {
          try {
            const graphUrl = `https://graph.microsoft.com/v1.0${graphPath}`;
            logger.debug(`Trying Graph API path: ${graphPath} [${requestId}]`);
            
            const graphResponse = await fetchWithRetry(graphUrl, {
              headers: {
                'Authorization': `Bearer ${graphToken}`,
                'Accept': 'text/html, */*',
              },
            });

            if (graphResponse.ok) {
              htmlContent = await graphResponse.text();
              fetchMethod = `Graph API (Path: ${graphPath})`;
              logger.info(`Successfully fetched newsletter using Graph API [${requestId}]`, {
                path: graphPath,
                contentLength: htmlContent.length,
                method: fetchMethod
              });
              break;
            } else {
              const errorText = await graphResponse.text();
              logger.debug(`Graph API path failed: ${graphPath} [${requestId}]`, {
                status: graphResponse.status,
                errorPreview: errorText.substring(0, 100) // Preview of error
              });
            }
          } catch (error: any) {
            logger.debug(`Error trying Graph API path: ${graphPath} [${requestId}]`, {
              errorMessage: error.message
            });
          }
        }

        if (!htmlContent) {
          logger.warn(`All Graph API paths failed [${requestId}]`);
        }
      } catch (error: any) {
        logger.error(`Error with Graph API approach [${requestId}]`, {
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack?.substring(0, 500)
        });
      }
    }

    // Method 3: Try direct HTML fetch as last resort
    if (!htmlContent) {
      try {
        logger.debug(`Attempting Method 3: Direct HTML fetch with delegated token [${requestId}]`);
        
        const directResponse = await fetchWithRetry(newsletterUrl, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'text/html, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (directResponse.ok) {
          htmlContent = await directResponse.text();
          fetchMethod = 'Direct HTML Fetch';
          logger.info(`Successfully fetched newsletter using direct HTML fetch [${requestId}]`, {
            contentLength: htmlContent.length,
            method: fetchMethod
          });
        } else {
          const errorText = await directResponse.text();
          logger.warn(`Direct HTML fetch failed [${requestId}]`, {
            status: directResponse.status,
            statusText: directResponse.statusText,
            errorPreview: errorText.substring(0, 200)
          });
        }
      } catch (error: any) {
        logger.error(`Error with direct HTML fetch [${requestId}]`, {
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack?.substring(0, 500)
        });
      }
    }

    // If we still don't have content, provide a fallback
    if (!htmlContent) {
      logger.error(`All methods failed to fetch newsletter content [${requestId}]`);
      logger.critical(`=== Newsletter API Request Failed [${requestId}] ===`);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch newsletter',
        details: 'All methods to fetch the newsletter failed. Please try again later.',
        requestId: requestId,
        newsletter: {
          title: 'Newsletter Temporarily Unavailable',
          content: `
            <div style="padding: 20px; text-align: center; color: #666;">
              <h2 style="color: #333;">Newsletter Temporarily Unavailable</h2>
              <p>We're having trouble loading the newsletter at the moment.</p>
              <p>This could be due to:</p>
              <ul style="text-align: left; display: inline-block; margin: 10px 0;">
                <li>SharePoint permissions</li>
                <li>Network connectivity issues</li>
                <li>The newsletter being updated</li>
              </ul>
              <p>Please try again in a few moments, or contact IT support if the issue persists.</p>
              <p style="margin-top: 20px; font-size: 0.9em; color: #999;">
                Error ID: ${requestId}
              </p>
            </div>
          `,
          lastUpdated: new Date().toISOString(),
          source: 'fallback'
        }
      });
    }

    // Process the HTML content
    logger.debug(`Processing HTML content [${requestId}]`, {
      originalLength: htmlContent.length
    });

    // Extract title from HTML if possible
    let title = 'CEO Newsletter';
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
      logger.debug(`Extracted title from HTML: ${title} [${requestId}]`);
    }

    // Clean up the HTML content
    // Remove SharePoint-specific scripts and styles that might interfere
    htmlContent = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    htmlContent = htmlContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Extract body content if it's a full HTML document
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      htmlContent = bodyMatch[1];
      logger.debug(`Extracted body content from full HTML document [${requestId}]`);
    }

    logger.info(`Newsletter content processed successfully [${requestId}]`, {
      processedLength: htmlContent.length,
      fetchMethod: fetchMethod,
      title: title
    });

    const newsletterData = {
      success: true,
      newsletter: {
        title: title,
        content: htmlContent,
        lastUpdated: new Date().toISOString(),
        source: fetchMethod,
        sharePointUrl: sharePointUrl
      },
      requestId: requestId
    };

    logger.critical(`=== Newsletter API Request Success [${requestId}] ===`);
    
    return NextResponse.json(newsletterData);

  } catch (error: any) {
    logger.error(`Unexpected error in newsletter API [${requestId}]`, {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack
    });
    
    logger.critical(`=== Newsletter API Request Error [${requestId}] ===`);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'An unexpected error occurred while fetching the newsletter.',
      requestId: requestId,
      newsletter: {
        title: 'Error Loading Newsletter',
        content: `
          <div style="padding: 20px; text-align: center; color: #666;">
            <h2 style="color: #d32f2f;">Error Loading Newsletter</h2>
            <p>An unexpected error occurred while loading the newsletter.</p>
            <p style="margin: 20px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; font-family: monospace; font-size: 0.9em;">
              ${error.message}
            </p>
            <p>Please try refreshing the page or contact IT support if the issue persists.</p>
            <p style="margin-top: 20px; font-size: 0.9em; color: #999;">
              Error ID: ${requestId}
            </p>
          </div>
        `,
        lastUpdated: new Date().toISOString(),
        source: 'error'
      }
    });
  }
}
