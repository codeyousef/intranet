import { NextRequest, NextResponse } from 'next/server';

/**
 * SharePoint Client for reading files from SharePoint
 * This implementation is read-only and does not support writing to SharePoint
 */

// SharePoint configuration
const SHAREPOINT_CONFIG = {
  siteUrl: 'https://flyadeal.sharepoint.com/sites/Thelounge',
  documentLibrary: 'Shared Documents',
};

// Enhanced logging system for troubleshooting
const logger = {
  // Always log important information
  info: (message: string, data?: any) => {
    console.log(`[SHAREPOINT-INFO] ${message}`, data ? data : '');
  },

  // Log critical information that should always be visible
  critical: (message: string, data?: any) => {
    console.log(`[SHAREPOINT-CRITICAL] ${message}`, data ? data : '');
  },

  // Log warnings that might indicate potential issues
  warn: (message: string, data?: any) => {
    console.warn(`[SHAREPOINT-WARN] ${message}`, data ? data : '');
  },

  // Log errors with detailed information
  error: (message: string, data?: any) => {
    console.error(`[SHAREPOINT-ERROR] ${message}`, data ? data : '');
  },

  // Log detailed debug information
  debug: (message: string, data?: any) => {
    console.log(`[SHAREPOINT-DEBUG] ${message}`, data ? data : '');
  },

  // Log API request details
  request: (method: string, url: string, headers?: any, body?: any) => {
    console.log(`[SHAREPOINT-REQUEST] ${method} ${url}`, { headers, body });
  },

  // Log API response details
  response: (url: string, status: number, headers?: any, body?: any) => {
    console.log(`[SHAREPOINT-RESPONSE] ${url} - Status: ${status}`, { headers, body });
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
  if (sanitizedOptions.headers && (sanitizedOptions.headers as any)['Authorization']) {
    (sanitizedOptions.headers as any)['Authorization'] = 'Bearer [TOKEN REDACTED]';
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
 * Get Graph API token
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

/**
 * Execute a function with a Graph API token
 * This handles token acquisition and retry logic
 */
async function withGraphToken<T>(
  callback: (token: string) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any = null;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      if (retryCount > 0) {
        logger.info(`SharePoint operation retry attempt ${retryCount} of ${maxRetries}...`);
        // Add exponential backoff delay between retries
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
      }

      // Get a fresh token for each attempt
      const token = await getGraphToken();
      
      // Execute the callback with the token
      return await callback(token);
    } catch (error: any) {
      lastError = error;
      
      // Check if this is a token-related error that warrants a retry
      const isRetryableError = 
        error.message?.includes('token') || 
        error.message?.includes('auth') ||
        error.message?.includes('timeout') ||
        error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND';
      
      // If we've reached max retries, or it's not a retryable error, throw the error
      if (retryCount >= maxRetries || !isRetryableError) {
        logger.error('SharePoint operation failed after', retryCount > 0 ? `${retryCount} retries:` : 'initial attempt:', error.message);
        // Add retry information to the error object
        error.retryAttempts = retryCount;
        throw error;
      }
      
      logger.warn(`SharePoint operation error (attempt ${retryCount + 1}/${maxRetries + 1}):`, error.message);
      retryCount++;
    }
  }
  
  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw lastError;
}

/**
 * Get file content from SharePoint
 * @param fileName Name of the file to retrieve (e.g., "Exp1004.csv")
 * @returns File content as text
 */
export async function getFileContent(fileName: string): Promise<string> {
  return withGraphToken(async (token) => {
    // Encode the file path for the URL
    const encodedFileName = encodeURIComponent(fileName);
    
    // Construct the Graph API URL to get the file
    const fileUrl = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_CONFIG.siteUrl}/drive/root:/${SHAREPOINT_CONFIG.documentLibrary}/${encodedFileName}:/content`;
    
    logger.info(`Retrieving file content from SharePoint: ${fileName}`);
    
    const response = await fetchWithRetry(
      fileUrl,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/plain, application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Failed to retrieve file from SharePoint: ${fileName}`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      throw new Error(`Failed to retrieve file from SharePoint: ${errorText}`);
    }
    
    // Get the content as text
    const content = await response.text();
    logger.info(`Successfully retrieved file from SharePoint: ${fileName}`, {
      contentLength: content.length
    });
    
    return content;
  });
}

/**
 * List files in a SharePoint folder
 * @param folderPath Path to the folder relative to the document library (optional)
 * @returns List of file information
 */
export async function listFiles(folderPath: string = ''): Promise<any[]> {
  return withGraphToken(async (token) => {
    // Construct the base path
    let path = `${SHAREPOINT_CONFIG.documentLibrary}`;
    if (folderPath) {
      path += `/${folderPath}`;
    }
    
    // Encode the path for the URL
    const encodedPath = encodeURIComponent(path);
    
    // Construct the Graph API URL to list files
    const listUrl = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_CONFIG.siteUrl}/drive/root:/${encodedPath}:/children`;
    
    logger.info(`Listing files in SharePoint folder: ${path}`);
    
    const response = await fetchWithRetry(
      listUrl,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Failed to list files in SharePoint folder: ${path}`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      throw new Error(`Failed to list files in SharePoint folder: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.value || !Array.isArray(data.value)) {
      logger.error(`Invalid response format when listing files in SharePoint folder: ${path}`, {
        responseKeys: Object.keys(data)
      });
      throw new Error('Invalid response format when listing files');
    }
    
    logger.info(`Successfully listed files in SharePoint folder: ${path}`, {
      fileCount: data.value.length
    });
    
    return data.value;
  });
}

/**
 * Test connection to SharePoint
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @returns Object with connection status and detailed error information if any
 */
export async function testConnection(maxRetries: number = 3): Promise<{ 
  connected: boolean; 
  error?: string; 
  details?: any; 
  troubleshooting?: string[];
  retryAttempts?: number;
}> {
  let retryAttempts = 0;

  try {
    // Test connection by listing files in the root folder
    await listFiles('', maxRetries);
    
    // If we get here, the connection was successful
    return { connected: true };
  } catch (error: any) {
    // Connection failed - capture detailed error information
    const errorMessage = error.message || 'Unknown error';
    console.error('SharePoint connection failed after retries:', errorMessage);

    // Format timestamp in a more user-friendly way
    const now = new Date();
    const formattedTimestamp = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()}, ${now.toLocaleTimeString()}`;

    // Extract retry information if available
    if (error.retryAttempts !== undefined) {
      retryAttempts = error.retryAttempts;
    }

    // Create a detailed error details object
    const errorDetails: Record<string, any> = {
      // Error details section
      'Error Code': error.code,
      'Message': error.message,
      'Type': error.name || 'Error',

      // Connection Information section
      'Connection Information': {
        'Site URL': SHAREPOINT_CONFIG.siteUrl,
        'Document Library': SHAREPOINT_CONFIG.documentLibrary,
        'Timestamp': formattedTimestamp
      }
    };

    // Basic troubleshooting tips
    const troubleshootingTips = [
      'Check your network connection',
      'Verify SharePoint site is accessible',
      'Ensure Azure AD credentials are correct',
      'Verify the app has proper permissions to access SharePoint',
      'Try again in a few minutes'
    ];

    // Add specific tips for different error types
    if (error.message && error.message.includes('token')) {
      errorDetails.friendlyMessage = 'Authentication failed when connecting to SharePoint.';
      troubleshootingTips.push(
        'Check if the Azure AD credentials are correct',
        'Verify the app has proper permissions in Azure AD',
        'Ensure the tenant ID is correct'
      );
    } else if (error.message && error.message.includes('404')) {
      errorDetails.friendlyMessage = 'The SharePoint site or document library was not found.';
      troubleshootingTips.push(
        'Verify the SharePoint site URL is correct',
        'Check if the document library name is correct',
        'Ensure the file path exists in SharePoint'
      );
    } else if (error.message && (error.message.includes('timeout') || error.message.includes('timed out'))) {
      errorDetails.friendlyMessage = 'The connection to SharePoint timed out.';
      troubleshootingTips.push(
        'Check your network connection speed and stability',
        'The SharePoint site might be temporarily unavailable or overloaded',
        'Try increasing the connection timeout settings'
      );
    }

    // Format the response
    return { 
      connected: false, 
      error: `Could not connect to SharePoint: ${errorMessage}`,
      details: errorDetails,
      troubleshooting: troubleshootingTips,
      retryAttempts: retryAttempts
    };
  }
}

/**
 * Verify access to a specific file in SharePoint
 * @param fileName Name of the file to verify (e.g., "Exp1004.csv")
 * @returns Object with access status and file details if successful
 */
export async function verifyFileAccess(fileName: string): Promise<{
  accessible: boolean;
  error?: string;
  fileDetails?: any;
}> {
  try {
    // Try to get the file content
    const content = await getFileContent(fileName);
    
    // If we get here, the file is accessible
    return { 
      accessible: true,
      fileDetails: {
        fileName: fileName,
        contentLength: content.length,
        previewContent: content.substring(0, 200) + (content.length > 200 ? '...' : '')
      }
    };
  } catch (error: any) {
    // File access failed
    return {
      accessible: false,
      error: `Could not access file "${fileName}": ${error.message}`
    };
  }
}