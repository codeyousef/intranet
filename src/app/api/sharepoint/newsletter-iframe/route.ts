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
    headers: options.headers ? { ...options.headers } : {},
    hasBody: !!options.body
  };

  // Mask authorization header if present
  if (sanitizedOptions.headers && sanitizedOptions.headers['Authorization']) {
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

// Newsletter API temporarily disabled while troubleshooting Viva Engage
export async function GET(request: NextRequest) {
  const requestId = `newsletter-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

  // Log request details
  logger.info(`Newsletter API request received but functionality is disabled [${requestId}]`, {
    url: request.url,
    method: request.method
  });

  logger.info(`Newsletter iframe API is temporarily disabled while troubleshooting Viva Engage [${requestId}]`);

  return NextResponse.json({
    success: false,
    disabled: true,
    message: 'Newsletter functionality is temporarily disabled while troubleshooting Viva Engage',
    requestId: requestId
  }, { status: 503 }) // 503 Service Unavailable
}
