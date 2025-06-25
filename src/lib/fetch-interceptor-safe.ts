/**
 * Fetch Interceptor for NextAuth (Safe Version)
 * 
 * This module adds global error handling for fetch requests made by NextAuth.
 * It helps prevent JSON parsing errors when the server returns non-JSON responses.
 * 
 * This version includes a check to ensure it only runs in browser environments.
 */

// Only run in browser environment
if (typeof window !== 'undefined') {
  // Store the original fetch function
  const originalFetch = global.fetch;

  // Override the global fetch function with our custom implementation
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      // Extract request details for logging
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method || 'GET';
      const requestHeaders = init?.headers ? JSON.stringify(init.headers) : 'none';

      // Log the request being made, but exclude certain types of requests
      // - Exclude newsletter requests (component is disabled)
      // - Exclude auth session requests (these are normal background requests)
      // - Only log requests that are relevant for debugging
      const isNewsletterRequest = url.includes('/api/sharepoint/newsletter');
      const isAuthSessionRequest = url.includes('/api/auth/session');

      // Skip logging for excluded request types
      const isCustomSignoutRequest = url.includes('/api/auth/custom-signout');
      if (!isNewsletterRequest && !isAuthSessionRequest && !isCustomSignoutRequest) {
        console.log(`[Fetch Interceptor] Request: ${method} ${url}`);
      }

      // Call the original fetch function
      const response = await originalFetch(input, init);

      // Clone the response so we can examine it without consuming it
      const clonedResponse = response.clone();

      // Check if this is a NextAuth request
      const isNextAuthRequest = url.includes('/api/auth/') || url.includes('/_next/auth');
      
      // If this is our custom signout endpoint, don't interfere
      if (isCustomSignoutRequest) {
        console.log('[Fetch Interceptor] Custom signout request - passing through');
        return response;
      }

      // Special handling for CSRF, signout, and session endpoints
      // These endpoints are critical for NextAuth functionality and may return non-JSON responses
      // or have special handling requirements that our interceptor might interfere with
      const isCsrfEndpoint = url.includes('/api/auth/csrf');
      const isSignoutEndpoint = url.includes('/api/auth/signout');
      const isSessionEndpoint = url.includes('/api/auth/session');

      // Special handling for signout endpoint - allow redirects to pass through
      if (isSignoutEndpoint) {
        // For signout, we want to allow redirects to pass through without modification
        // This is important because the signout endpoint returns a redirect response
        // that should be followed by the browser

        // Check if the response is a redirect (status 302 or 303)
        if (response.status === 302 || response.status === 303) {
          console.log(`[Fetch Interceptor] Allowing signout redirect to pass through: ${response.status} ${response.statusText}`);
          return response;
        }

        // If the response is not a redirect but is successful, also pass it through
        if (response.ok) {
          console.log(`[Fetch Interceptor] Allowing successful signout response to pass through: ${response.status} ${response.statusText}`);
          return response;
        }

        // If we get here, the response is an error
        try {
          // Try to get the text to see what was returned
          const text = await clonedResponse.text();

          console.warn(`[Fetch Interceptor] Signout endpoint returned error: ${response.status} ${response.statusText}`, {
            responseText: text.substring(0, 500)
          });

          // For signout errors, we'll create a fake redirect response
          // This ensures the user can still sign out even if there's a server error
          const redirectUrl = window.location.href.split('?')[0]; // Remove any query params

          console.log(`[Fetch Interceptor] Creating fake redirect for signout to: ${redirectUrl}`);

          return new Response(null, {
            status: 302,
            headers: {
              'Location': redirectUrl,
              'Content-Type': 'text/plain'
            }
          });
        } catch (error) {
          console.error('[Fetch Interceptor] Error processing signout response:', error);

          // If all else fails, just return the original response
          return response;
        }
      }

      // Special handling for CSRF endpoint
      // This is important because NextAuth needs the CSRF token to make the signout request
      if (isCsrfEndpoint) {
        // Check if the response is OK and has a JSON content type
        const contentType = response.headers.get('content-type');

        // If the response is not OK or not JSON, we need to transform it
        if (!response.ok || (contentType && !contentType.includes('application/json'))) {
          try {
            // Try to get the text to see what was returned
            const text = await clonedResponse.text();

            console.log(`[Fetch Interceptor] Transforming CSRF error response: ${response.status} ${response.statusText}`);

            // Return a valid JSON response with a CSRF token
            // This allows NextAuth to continue with the signout process
            return new Response(JSON.stringify({
              csrfToken: "dummy-csrf-token-for-signout",
              error: 'csrf_fetch_error',
              message: 'Error fetching CSRF token, using fallback',
              status: response.status,
              url
            }), {
              status: 200, // Use 200 status so NextAuth can handle the error properly
              headers: {
                'Content-Type': 'application/json'
              }
            });
          } catch (error) {
            console.error('[Fetch Interceptor] Error processing CSRF response:', error);
          }
        }

        // If the response is OK and JSON, return it as is
        return response;
      }

      // For session endpoints, we need to ensure they return valid JSON
      // even if the server returns an HTML error page
      if (isSessionEndpoint) {
        // Check if the response is OK and has a JSON content type
        const contentType = response.headers.get('content-type');
        if (!response.ok || (contentType && !contentType.includes('application/json'))) {
          try {
            // Try to get the text to see what was returned
            const text = await clonedResponse.text();

            // Log the error for debugging
            console.warn(`[Fetch Interceptor] Critical NextAuth endpoint returned non-JSON or error response`, {
              url,
              method,
              status: response.status,
              statusText: response.statusText,
              contentType,
              responseText: text.substring(0, 500) // Show more of the response text
            });

            // Return an empty session response
            // This allows NextAuth to continue without breaking
            return new Response(JSON.stringify({
              user: null,
              expires: null
            }), {
              status: 200, // Use 200 so NextAuth can handle the response
              headers: {
                'Content-Type': 'application/json'
              }
            });
          } catch (error) {
            console.error('[Fetch Interceptor] Error processing critical NextAuth endpoint response:', error);

            // Even if we fail to process the response, return empty session
            return new Response(JSON.stringify({ 
              user: null,
              expires: null
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }

        // If the response is OK and has a JSON content type, return it as is
        return response;
      }

      if (isNextAuthRequest) {
        // For NextAuth requests, we need to handle potential non-JSON responses
        try {
          // Special handling for 500 errors from any NextAuth endpoint
          // These are likely server errors that need to be converted to valid JSON
          if (response.status === 500) {
            try {
              // Try to get the content type and response text
              const contentType = response.headers.get('content-type');
              const text = await clonedResponse.text();

              console.warn(`[Fetch Interceptor] NextAuth endpoint returned 500 error`, {
                url,
                method,
                contentType,
                responseText: text.substring(0, 500)
              });

              // Return a valid JSON response with error information
              return new Response(JSON.stringify({
                error: 'server_error',
                message: 'The server encountered an error',
                status: 500,
                url,
                timestamp: new Date().toISOString()
              }), {
                status: 200, // Use 200 status so NextAuth can handle the error properly
                headers: {
                  'Content-Type': 'application/json'
                }
              });
            } catch (error) {
              console.error('[Fetch Interceptor] Error processing 500 response:', error);
            }
          }

          // Try to get the content type
          const contentType = response.headers.get('content-type');

          // If the content type is not JSON, log a warning and return a valid JSON response
          if (contentType && !contentType.includes('application/json')) {
            // Try to get the text to see what was returned
            const text = await clonedResponse.text();

            console.warn(`[Fetch Interceptor] ERROR: NextAuth request received non-JSON response`, {
              url,
              method,
              requestHeaders,
              status: response.status,
              statusText: response.statusText,
              contentType,
              responseHeaders: Object.fromEntries([...response.headers.entries()]),
              responseText: text.substring(0, 500), // Show more of the response text
              timestamp: new Date().toISOString()
            });

            // For NextAuth session endpoint specifically, log details only in development mode
            if (url.includes('/api/auth/session') && process.env.NODE_ENV === 'development') {
              console.error(`[Fetch Interceptor] Auth session endpoint returned non-JSON response`, {
                url,
                method,
                status: response.status,
                statusText: response.statusText,
                contentType,
                timestamp: new Date().toISOString()
              });
            }

            // Return a valid JSON response with an error message
            return new Response(JSON.stringify({
              error: 'non_json_response',
              message: 'The server returned a non-JSON response',
              status: response.status,
              url
            }), {
              status: 200,
              headers: {
                'Content-Type': 'application/json'
              }
            });
          }

          // If the response is JSON but has an error status, log it but don't modify the response
          // NextAuth will handle these errors appropriately
          if (!response.ok) {
            try {
              // Try to parse the JSON to see if it contains an error message
              const errorData = await clonedResponse.json();
              // Only log the error in development mode or if it's not an auth session request
              // This reduces noise in production logs for expected auth session failures
              const isAuthSessionRequest = url.includes('/api/auth/session');
              if (process.env.NODE_ENV === 'development' || !isAuthSessionRequest) {
                console.error(`[Fetch Interceptor] ERROR: NextAuth request failed with status: ${response.status}`, {
                  url,
                  method,
                  requestHeaders,
                  status: response.status,
                  statusText: response.statusText,
                  responseHeaders: Object.fromEntries([...response.headers.entries()]),
                  errorData,
                  timestamp: new Date().toISOString()
                });
              }

              // For 500 errors on session endpoint, return empty session
              if (response.status === 500 && url.includes('/api/auth/session')) {
                console.warn('[Fetch Interceptor] Session endpoint returned 500 error, returning empty session');

                // Return empty session to allow auth flow to continue
                return new Response(JSON.stringify({
                  user: null,
                  expires: null
                }), {
                  status: 200,
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });
              }

              // For 500 errors with any NextAuth request, log additional information to help debugging
              // but only in development mode to reduce noise in production
              if (response.status === 500 && process.env.NODE_ENV === 'development') {
                console.error('[Fetch Interceptor] NextAuth request returned 500 error', {
                  url,
                  method,
                  errorData,
                  timestamp: new Date().toISOString()
                });
              }

              // For other error statuses, let NextAuth handle them
            } catch (jsonError) {
              // If we can't parse the JSON, it might be an HTML error page
              try {
                const text = await response.clone().text();

                // Only log the error in development mode or if it's not an auth session request
                // This reduces noise in production logs for expected auth session failures
                const isAuthSessionRequest = url.includes('/api/auth/session');
                if (process.env.NODE_ENV === 'development' || !isAuthSessionRequest) {
                  console.error(`[Fetch Interceptor] ERROR: NextAuth request failed with status: ${response.status} (non-JSON response)`, {
                    url,
                    method,
                    requestHeaders,
                    status: response.status,
                    statusText: response.statusText,
                    responseHeaders: Object.fromEntries([...response.headers.entries()]),
                    responseText: text.substring(0, 500), // Show more of the response text
                    parseError: jsonError.message,
                    timestamp: new Date().toISOString()
                  });
                }

                // Return a valid JSON response with an error message
                return new Response(JSON.stringify({
                  error: 'invalid_json_response',
                  message: 'The server returned an invalid JSON response',
                  status: response.status,
                  url
                }), {
                  status: 200,
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });
              } catch (textError) {
                // Only log the error in development mode to reduce noise in production
                if (process.env.NODE_ENV === 'development') {
                  console.error('[Fetch Interceptor] Error getting response text:', textError);
                }
              }
            }
          }
        } catch (error) {
          // Only log the error in development mode or if it's not an auth session request
          // This reduces noise in production logs for expected auth session failures
          const isAuthSessionRequest = url.includes('/api/auth/session');
          if (process.env.NODE_ENV === 'development' || !isAuthSessionRequest) {
            console.error('[Fetch Interceptor] ERROR: Exception in fetch interceptor processing:', {
              url,
              method,
              error: error.message,
              stack: error.stack,
              timestamp: new Date().toISOString()
            });
          }
        }
      } else if (!response.ok) {
        // Log non-NextAuth request errors too, but exclude newsletter requests
        // and only log in development mode to reduce noise in production
        const isNewsletterRequest = url.includes('/api/sharepoint/newsletter');
        if (!isNewsletterRequest && process.env.NODE_ENV === 'development') {
          console.warn(`[Fetch Interceptor] Non-NextAuth request failed: ${method} ${url}`, {
            status: response.status,
            statusText: response.statusText,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Return the original response if everything is fine
      return response;
    } catch (error) {
      // Extract URL for filtering
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input?.url || 'unknown';
      const method = init?.method || 'GET';

      // Determine if this is a request we want to exclude from logging
      const isNewsletterRequest = url.includes('/api/sharepoint/newsletter');
      const isAuthSessionRequest = url.includes('/api/auth/session');

      // Log fetch errors with detailed information, but be selective
      // Only log in development mode and exclude certain types of requests
      if (!isNewsletterRequest && (process.env.NODE_ENV === 'development' || !isAuthSessionRequest)) {
        console.error('[Fetch Interceptor] Fetch operation failed', {
          url,
          method,
          error: error.message,
          // Only include stack trace in development mode
          ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
          timestamp: new Date().toISOString()
        });
      }

      throw error;
    }
  };
}

export {};
