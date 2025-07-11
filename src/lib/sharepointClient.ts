import { NextRequest, NextResponse } from 'next/server';

/**
 * SharePoint Client for reading files from SharePoint
 * This implementation is read-only and does not support writing to SharePoint
 */

// SharePoint configuration
const SHAREPOINT_CONFIG = {
  siteUrl: 'https://flyadeal.sharepoint.com/sites/Thelounge',
  hostname: 'flyadeal.sharepoint.com',
  sitePath: '/sites/Thelounge',
  documentLibrary: 'Shared Documents',
};

// Cache for site ID to avoid repeated lookups
let cachedSiteId: string | null = null;

// No logging

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

  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Check if response is successful or if it's a 404 (which we don't want to retry)
      if (response.ok || response.status === 404) {
        return response;
      }

      // For other error status codes (500, 429, etc.), we'll retry
      lastResponse = response;

      // Only wait if we're going to retry
      if (attempt < maxRetries) {
        const backoffTime = 1000 * attempt;
        // Exponential backoff: wait longer between each retry
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    } catch (error: any) {
      lastError = error;

      // Only wait if we're going to retry
      if (attempt < maxRetries) {
        const backoffTime = 1000 * attempt;
        // Exponential backoff: wait longer between each retry
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }

  const totalDuration = Date.now() - startTime;

  // If we get here, all retries failed
  if (lastResponse) {
    return lastResponse; // Return the last error response
  }

  throw lastError || new Error(`All fetch attempts failed for ${url}`);
}

/**
 * Get Graph API token
 */
async function getGraphToken() {

  // Check if environment variables are set
  if (!process.env.AZURE_AD_TENANT_ID) {
    throw new Error('AZURE_AD_TENANT_ID environment variable is not set');
  }

  if (!process.env.AZURE_AD_CLIENT_ID) {
    throw new Error('AZURE_AD_CLIENT_ID environment variable is not set');
  }

  if (!process.env.AZURE_AD_CLIENT_SECRET) {
    throw new Error('AZURE_AD_CLIENT_SECRET environment variable is not set');
  }

  const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;

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
      throw new Error(`Graph token acquisition failed: ${error}`);
    }

    const data = await response.json();

    // Check if we got an access token
    if (!data.access_token) {
      throw new Error('Graph token response did not contain an access token');
    }

    return data.access_token;
  } catch (error: any) {
    throw error;
  }
}

/**
 * Get SharePoint site ID
 * @param token Graph API token
 * @returns Site ID
 */
async function getSiteId(token: string): Promise<string> {
  // Return cached site ID if available
  if (cachedSiteId) {
    return cachedSiteId;
  }

  
  // Construct the URL to get site info
  const siteInfoUrl = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_CONFIG.hostname}:${SHAREPOINT_CONFIG.sitePath}`;
  
  const response = await fetchWithRetry(
    siteInfoUrl,
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
    throw new Error(`Failed to get site information: ${errorText}`);
  }
  
  const siteData = await response.json();
  
  if (!siteData.id) {
    throw new Error('Site response did not contain an ID');
  }
  
  // Cache the site ID
  cachedSiteId = siteData.id;
  
  return siteData.id;
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
        // Add retry information to the error object
        error.retryAttempts = retryCount;
        throw error;
      }
      
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
    // First get the site ID
    const siteId = await getSiteId(token);
    
    // Encode the file path for the URL
    const encodedFileName = encodeURIComponent(fileName);
    
    // Construct the Graph API URL to get the file
    // For files in the default document library, don't include "Shared Documents" in the path
    const fileUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodedFileName}:/content`;
    
    
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
      throw new Error(`Failed to retrieve file from SharePoint: ${errorText}`);
    }
    
    // Get the content as text
    const content = await response.text();
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
    // First get the site ID
    const siteId = await getSiteId(token);
    
    let listUrl: string;
    if (!folderPath || folderPath === '') {
      // For root folder of the default document library, just use /drive/root/children
      listUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`;
    } else {
      // For subfolders, don't include "Shared Documents" prefix if it's the default library
      const encodedPath = encodeURIComponent(folderPath);
      listUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodedPath}:/children`;
    }
    
    
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
      throw new Error(`Failed to list files in SharePoint folder: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.value || !Array.isArray(data.value)) {
      throw new Error('Invalid response format when listing files');
    }
    
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
    await listFiles('');
    
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