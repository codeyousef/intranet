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

export async function GET(request: NextRequest) {
  const requestStartTime = Date.now();
  const requestId = `newsletter-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

  // Log request details
  logger.info(`Newsletter API request received [${requestId}]`, {
    url: request.url,
    method: request.method,
    headers: {
      'user-agent': request.headers.get('user-agent'),
      'accept': request.headers.get('accept'),
      'accept-language': request.headers.get('accept-language'),
      'referer': request.headers.get('referer'),
      'x-forwarded-for': request.headers.get('x-forwarded-for')
    }
  });

  try {
    logger.critical(`Starting newsletter fetch process [${requestId}]`);

    // Get Graph token
    logger.info(`Requesting Graph API token [${requestId}]`);
    const tokenStartTime = Date.now();
    const token = await getGraphToken();
    logger.info(`Successfully obtained Graph token [${requestId}]`, {
      duration: Date.now() - tokenStartTime
    });

    // Site details from your test results
    const siteId = 'flyadeal.sharepoint.com,e6589590-5aca-4d4a-a14e-1a7b9f51396d,94ed5344-9dd1-42c9-b663-cb57c49ab1d4';
    const fileName = 'last-newsletter.html';

    logger.info(`Looking for file: ${fileName} in site: ${siteId} [${requestId}]`);

    // First, let's find the correct drive and folder structure
    logger.info(`Fetching drives from SharePoint [${requestId}]`);
    const drivesStartTime = Date.now();
    const drivesResponse = await fetchWithRetry(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
    );

    if (!drivesResponse.ok) {
      logger.error(`Failed to get drives [${requestId}]`, {
        status: drivesResponse.status,
        statusText: drivesResponse.statusText,
        duration: Date.now() - drivesStartTime
      });
      throw new Error(`Failed to get drives: ${drivesResponse.status}`);
    }

    const drivesData = await drivesResponse.json();
    logger.info(`Successfully fetched drives [${requestId}]`, {
      count: drivesData.value.length,
      driveNames: drivesData.value.map(d => d.name),
      duration: Date.now() - drivesStartTime
    });

    // Try to find the file in each drive
    for (const drive of drivesData.value) {
      logger.info(`Searching for "${fileName}" in drive: ${drive.name} (${drive.id}) [${requestId}]`);
      const driveSearchStartTime = Date.now();

      // Search for the file
      try {
        const searchUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${drive.id}/root/search(q='${fileName}')`;
        logger.debug(`Executing search query [${requestId}]`, { searchUrl, driveName: drive.name });

        const searchResponse = await fetchWithRetry(
            searchUrl,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
              },
            }
        );

        if (!searchResponse.ok) {
          logger.warn(`Search in drive ${drive.name} returned error status [${requestId}]`, {
            status: searchResponse.status,
            statusText: searchResponse.statusText,
            duration: Date.now() - driveSearchStartTime
          });
          continue;
        }

        const searchData = await searchResponse.json();
        const resultCount = searchData.value ? searchData.value.length : 0;

        logger.info(`Search completed in drive ${drive.name} [${requestId}]`, {
          resultCount,
          duration: Date.now() - driveSearchStartTime
        });

        if (resultCount > 0) {
          // Found the file!
          const file = searchData.value[0];
          logger.info(`Found file in drive ${drive.name} [${requestId}]`, {
            fileName: file.name,
            fileId: file.id,
            lastModified: file.lastModifiedDateTime,
            webUrl: file.webUrl || 'No URL available'
          });

          // Get the file content
          logger.info(`Fetching file content [${requestId}]`);
          const contentStartTime = Date.now();
          const contentUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${drive.id}/items/${file.id}/content`;

          const contentResponse = await fetchWithRetry(
              contentUrl,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'text/html',
                },
              }
          );

          if (!contentResponse.ok) {
            logger.error(`Failed to fetch file content [${requestId}]`, {
              status: contentResponse.status,
              statusText: contentResponse.statusText,
              fileId: file.id,
              driveName: drive.name,
              duration: Date.now() - contentStartTime
            });
            continue;
          }

          const htmlContent = await contentResponse.text();
          const contentLength = htmlContent.length;

          logger.critical(`Successfully fetched newsletter content [${requestId}]`, {
            driveName: drive.name,
            contentLength,
            duration: Date.now() - contentStartTime,
            totalDuration: Date.now() - requestStartTime
          });

          // Log a sample of the content for debugging (first 100 chars)
          if (contentLength > 0) {
            logger.debug(`Content sample [${requestId}]`, {
              sample: htmlContent.substring(0, 100) + '...'
            });
          } else {
            logger.warn(`Empty content received [${requestId}]`);
          }

          return NextResponse.json({
            success: true,
            newsletter: {
              title: 'CEO Newsletter',
              content: htmlContent,
              sharePointUrl: file.webUrl || '',
              lastUpdated: file.lastModifiedDateTime || new Date().toISOString(),
              source: `Graph API - ${drive.name}`,
              type: 'html',
            },
          });
        }
      } catch (searchError: any) {
        // Search failed, log error and continue to next drive
        logger.error(`Error searching drive ${drive.name} [${requestId}]`, {
          errorMessage: searchError.message,
          stack: searchError.stack,
          duration: Date.now() - driveSearchStartTime
        });
      }
    }

    // If search didn't work, try direct paths
    logger.info(`Search approach did not find the file, trying direct paths [${requestId}]`);

    // Try common SharePoint document library paths
    const pathsToTry = [
      '/CEO Newsletter/last-newsletter.html',
      '/Shared Documents/CEO Newsletter/last-newsletter.html',
      '/Documents/CEO Newsletter/last-newsletter.html',
      '/sites/Thelounge/CEO Newsletter/last-newsletter.html',
      '/SiteAssets/CEO Newsletter/last-newsletter.html',
      '/SitePages/CEO Newsletter/last-newsletter.html',
    ];

    logger.info(`Will try the following paths [${requestId}]`, { paths: pathsToTry });

    // Get the default drive (usually "Documents" library)
    logger.info(`Fetching default drive [${requestId}]`);
    const defaultDriveStartTime = Date.now();
    const defaultDriveUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`;

    const defaultDriveResponse = await fetchWithRetry(
        defaultDriveUrl,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
    );

    if (!defaultDriveResponse.ok) {
      logger.error(`Failed to get default drive [${requestId}]`, {
        status: defaultDriveResponse.status,
        statusText: defaultDriveResponse.statusText,
        duration: Date.now() - defaultDriveStartTime
      });
      logger.info(`Continuing to last resort approach [${requestId}]`);
      // Continue to last resort approach
    } else {
      const defaultDrive = await defaultDriveResponse.json();
      logger.info(`Successfully fetched default drive [${requestId}]`, {
        name: defaultDrive.name || 'Unknown',
        id: defaultDrive.id || 'No ID',
        webUrl: defaultDrive.webUrl || 'No URL',
        duration: Date.now() - defaultDriveStartTime
      });

      // Try each path in the default drive
      for (const path of pathsToTry) {
        const pathStartTime = Date.now();
        try {
          logger.info(`Trying path: ${path} [${requestId}]`);
          const fileUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:${encodeURIComponent(path)}:/content`;

          logger.debug(`Fetching file content from direct path [${requestId}]`, {
            path,
            fileUrl
          });

          const fileResponse = await fetchWithRetry(fileUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'text/html',
            },
            redirect: 'follow', // Follow redirects
          });

          if (fileResponse.ok) {
            const htmlContent = await fileResponse.text();
            const contentLength = htmlContent.length;

            logger.info(`Successfully fetched file from path: ${path} [${requestId}]`, {
              contentLength,
              duration: Date.now() - pathStartTime
            });

            if (contentLength > 0) {
              logger.critical(`Found valid newsletter content at path: ${path} [${requestId}]`, {
                contentLength,
                duration: Date.now() - pathStartTime,
                totalDuration: Date.now() - requestStartTime
              });

              // Log a sample of the content for debugging (first 100 chars)
              logger.debug(`Content sample from path ${path} [${requestId}]`, {
                sample: htmlContent.substring(0, 100) + '...'
              });

              return NextResponse.json({
                success: true,
                newsletter: {
                  title: 'CEO Newsletter',
                  content: htmlContent,
                  sharePointUrl: `https://flyadeal.sharepoint.com/sites/Thelounge${path}`,
                  lastUpdated: new Date().toISOString(),
                  source: `Graph API - ${path}`,
                  type: 'html',
                },
              });
            } else {
              logger.warn(`File found at path: ${path}, but content is empty [${requestId}]`, {
                duration: Date.now() - pathStartTime
              });
            }
          } else if (fileResponse.status === 404) {
            logger.info(`File not found at path: ${path} (404) [${requestId}]`, {
              duration: Date.now() - pathStartTime
            });
            // File not found, continue to next path
          } else {
            logger.warn(`Error accessing path: ${path} [${requestId}]`, {
              status: fileResponse.status,
              statusText: fileResponse.statusText,
              duration: Date.now() - pathStartTime
            });
            // Error accessing path, continue to next path
          }
        } catch (pathError: any) {
          // Failed to try path, log error and continue to next path
          logger.error(`Exception trying path: ${path} [${requestId}]`, {
            errorMessage: pathError.message,
            stack: pathError.stack,
            duration: Date.now() - pathStartTime
          });
        }
      }
    }

    // Last resort: List all files in the CEO Newsletter folder if we can find it
    logger.info(`Trying last resort approach: checking CEO Newsletter folder directly [${requestId}]`);
    const lastResortStartTime = Date.now();

    try {
      // Try to access the CEO Newsletter folder directly
      const folderUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/CEO Newsletter:/children`;
      logger.debug(`Accessing CEO Newsletter folder [${requestId}]`, { folderUrl });

      const folderResponse = await fetchWithRetry(
          folderUrl,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
      );

      if (!folderResponse.ok) {
        logger.warn(`Could not access CEO Newsletter folder [${requestId}]`, {
          status: folderResponse.status,
          statusText: folderResponse.statusText,
          duration: Date.now() - lastResortStartTime
        });
      } else {
        const folderData = await folderResponse.json();
        const itemCount = folderData.value ? folderData.value.length : 0;

        logger.info(`Successfully accessed CEO Newsletter folder [${requestId}]`, {
          itemCount,
          itemNames: folderData.value ? folderData.value.map(item => item.name) : [],
          duration: Date.now() - lastResortStartTime
        });

        // Check all files in the folder
        for (const item of folderData.value) {
          const itemStartTime = Date.now();
          logger.debug(`Checking item in folder [${requestId}]`, {
            name: item.name,
            id: item.id,
            isFile: !!item.file,
            lastModified: item.lastModifiedDateTime
          });

          if (item.name === fileName && item.file) {
            logger.info(`Found the newsletter file: ${fileName} in CEO Newsletter folder [${requestId}]`);
            // Get this file's content
            const contentUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${item.id}/content`;
            logger.debug(`Fetching file content [${requestId}]`, { contentUrl });

            const contentResponse = await fetchWithRetry(
                contentUrl,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'text/html',
                  },
                }
            );

            if (!contentResponse.ok) {
              logger.error(`Failed to fetch content for file: ${fileName} [${requestId}]`, {
                status: contentResponse.status,
                statusText: contentResponse.statusText,
                duration: Date.now() - itemStartTime
              });
            } else {
              const htmlContent = await contentResponse.text();
              const contentLength = htmlContent.length;

              logger.critical(`Successfully fetched newsletter content from last resort approach [${requestId}]`, {
                contentLength,
                duration: Date.now() - itemStartTime,
                totalDuration: Date.now() - requestStartTime
              });

              // Log a sample of the content for debugging (first 100 chars)
              if (contentLength > 0) {
                logger.debug(`Content sample from last resort approach [${requestId}]`, {
                  sample: htmlContent.substring(0, 100) + '...'
                });
              } else {
                logger.warn(`Empty content received from last resort approach [${requestId}]`);
              }

              return NextResponse.json({
                success: true,
                newsletter: {
                  title: 'CEO Newsletter',
                  content: htmlContent,
                  sharePointUrl: item.webUrl || '',
                  lastUpdated: item.lastModifiedDateTime || new Date().toISOString(),
                  source: 'Graph API - CEO Newsletter folder',
                  type: 'html',
                },
              });
            }
          }
        }

        // If we get here, we didn't find the file in the folder
        logger.warn(`File ${fileName} not found in CEO Newsletter folder [${requestId}]`, {
          itemsChecked: itemCount,
          duration: Date.now() - lastResortStartTime
        });
      }
    } catch (folderError: any) {
      // Could not list folder contents, log error and continue
      logger.error(`Exception accessing CEO Newsletter folder [${requestId}]`, {
        errorMessage: folderError.message,
        stack: folderError.stack,
        duration: Date.now() - lastResortStartTime
      });
    }

    // If we get here, we couldn't find the file
    throw new Error('Newsletter file not found in any location');

  } catch (error: any) {
    const totalDuration = Date.now() - requestStartTime;
    logger.error(`Newsletter API Error [${requestId}]`, {
      errorMessage: error.message,
      stack: error.stack,
      totalDuration
    });

    // Log detailed error information for troubleshooting
    logger.critical(`Newsletter fetch failed [${requestId}]`, {
      errorType: error.name || 'Unknown',
      errorMessage: error.message,
      totalDuration,
      timestamp: new Date().toISOString()
    });

    // Return error with helpful information
    const errorHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0;">Newsletter Not Found</h3>
          <p style="margin: 0;">We couldn't locate the newsletter file in SharePoint.</p>
        </div>

        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0;">Possible Issues:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li>The file "last-newsletter.html" may not exist in the expected location</li>
            <li>The file might be in a different folder than "CEO Newsletter"</li>
            <li>The file name might be different (check for spaces or special characters)</li>
          </ul>
        </div>

        <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px;">
          <h4 style="margin: 0 0 10px 0;">Next Steps:</h4>
          <ol style="margin: 0; padding-left: 20px;">
            <li>Verify the file exists at: <code>/sites/Thelounge/CEO Newsletter/last-newsletter.html</code></li>
            <li>Check if the file has been moved or renamed</li>
            <li>Ensure the file is in a document library accessible to the app</li>
          </ol>
        </div>

        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="margin: 0; font-size: 12px; color: #6c757d;">
            <strong>Debug Info:</strong><br>
            Site ID: ${siteId || 'Not available'}<br>
            Timestamp: ${new Date().toISOString()}<br>
            Request ID: ${requestId}<br>
            Error: ${error.message}
          </p>
        </div>
      </div>
    `;

    // Log that we're returning fallback content
    logger.info(`Returning fallback content for newsletter [${requestId}]`, {
      errorHtmlLength: errorHtml.length,
      totalDuration
    });

    return NextResponse.json(
        {
          success: false,
          error: 'Newsletter file not found',
          details: error.message,
          requestId: requestId,
          newsletter: {
            title: 'Newsletter Not Found',
            content: errorHtml,
            sharePointUrl: '',
            lastUpdated: new Date().toISOString(),
            source: 'Error Handler',
            type: 'html',
          },
        },
        { status: 404 }
    );
  }
}
