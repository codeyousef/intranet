// app/api/viva-engage/proxy-resource/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * This API route serves as a proxy for resources requested by the Viva Engage component.
 * It's specifically designed to handle requests that would normally go to localhost:3001,
 * which is causing 404 errors in the browser.
 */

// Helper function to create CORS headers
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS, POST, PUT',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

export async function GET(request: NextRequest) {
  try {
    // Get the URL from the query parameters
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing URL parameter',
        },
        { status: 400 }
      );
    }

    // Log the request for debugging
    console.log(`Proxy resource request for: ${url}`);

    // Check if this is a request for auth-msal.js (from localhost:3001 or web.yammer.com)
    if (url.includes('auth-msal.js') || url.includes('4-auth-msal.js')) {
      console.log(`Handling MSAL script request: ${url}`);

      // Create a more robust MSAL replacement script
      const msalScript = `
        // MSAL replacement script for ${url}
        console.log('[Proxy] Using proxy-provided MSAL module for: ${url}');

        // Define a global MSAL object if it doesn't exist
        if (typeof window !== 'undefined' && typeof window.msal === 'undefined') {
          console.log('[Proxy] Creating global MSAL object');
          window.msal = {
            PublicClientApplication: function(config) {
              console.log('[Proxy] MSAL PublicClientApplication instantiated with config:', config);
              this.config = config;
              this.loginPopup = function() { 
                console.log('[Proxy] MSAL loginPopup called');
                return Promise.resolve({ account: { username: 'proxy-user@example.com' } }); 
              };
              this.loginRedirect = function() { 
                console.log('[Proxy] MSAL loginRedirect called');
                return Promise.resolve(); 
              };
              this.logout = function() { 
                console.log('[Proxy] MSAL logout called');
                return Promise.resolve(); 
              };
              this.getActiveAccount = function() { 
                console.log('[Proxy] MSAL getActiveAccount called');
                return { username: 'proxy-user@example.com' }; 
              };
              this.getAllAccounts = function() { 
                console.log('[Proxy] MSAL getAllAccounts called');
                return [{ username: 'proxy-user@example.com' }]; 
              };
              this.setActiveAccount = function() { 
                console.log('[Proxy] MSAL setActiveAccount called');
                return true; 
              };
              this.acquireTokenSilent = function(request) { 
                console.log('[Proxy] MSAL acquireTokenSilent called with request:', request);
                return Promise.resolve({ 
                  accessToken: 'fake-token-' + Date.now(),
                  account: { username: 'proxy-user@example.com' },
                  expiresOn: new Date(Date.now() + 3600000),
                  scopes: request && request.scopes || ['user.read']
                }); 
              };
              this.acquireTokenPopup = function(request) { 
                console.log('[Proxy] MSAL acquireTokenPopup called with request:', request);
                return Promise.resolve({ 
                  accessToken: 'fake-token-' + Date.now(),
                  account: { username: 'proxy-user@example.com' },
                  expiresOn: new Date(Date.now() + 3600000),
                  scopes: request && request.scopes || ['user.read']
                }); 
              };
              this.acquireTokenRedirect = function() { 
                console.log('[Proxy] MSAL acquireTokenRedirect called');
                return Promise.resolve(); 
              };
            },
            // Add other MSAL classes and constants as needed
            InteractionType: {
              Popup: 'popup',
              Redirect: 'redirect',
              Silent: 'silent'
            },
            BrowserAuthError: function(errorCode, errorMessage) {
              this.errorCode = errorCode;
              this.errorMessage = errorMessage;
              this.stack = (new Error()).stack;
              this.name = "BrowserAuthError";
            }
          };
        } else {
          console.log('[Proxy] Using existing global MSAL object');
        }

        // Export the MSAL module for different module systems
        if (typeof window !== 'undefined') {
          if (typeof module !== 'undefined' && module.exports) {
            console.log('[Proxy] Exporting MSAL for CommonJS');
            module.exports = window.msal;
          }

          if (typeof define === 'function' && define.amd) {
            console.log('[Proxy] Exporting MSAL for AMD');
            define('msal', [], function() { return window.msal; });
          }
        }

        // For webpack chunk loading - only in browser environment
        if (typeof window !== 'undefined' && typeof __webpack_require__ !== 'undefined') {
          console.log('[Proxy] Setting up MSAL for webpack');

          // Try to define chunk 1278 directly
          try {
            if (__webpack_require__.m && typeof __webpack_require__.m === 'object') {
              __webpack_require__.m['1278'] = function(module, exports) {
                module.exports = window.msal;
              };
              console.log('[Proxy] Successfully defined chunk 1278 in webpack modules');
            }
          } catch (e) {
            console.error('[Proxy] Failed to define chunk 1278:', e);
          }
        }

        console.log('[Proxy] MSAL module setup complete');
      `;

      return new NextResponse(msalScript, {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...getCorsHeaders(),
        },
      });
    }

    // For other JS files, return a generic module
    if (url.endsWith('.js')) {
      const jsFileName = url.split('/').pop();
      const jsContent = `
        // Proxy replacement for ${jsFileName}
        console.log('Proxy loaded empty replacement for: ${jsFileName}');

        // Define an empty module if needed
        if (typeof window !== 'undefined' && typeof window.define === 'function' && window.define.amd) {
          define([], function() { return {}; });
        }
      `;

      return new NextResponse(jsContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=3600',
          ...getCorsHeaders(),
        },
      });
    }

    // For CSS files, return an empty stylesheet
    if (url.endsWith('.css')) {
      return new NextResponse('/* Proxy CSS placeholder */', {
        status: 200,
        headers: {
          'Content-Type': 'text/css',
          'Cache-Control': 'public, max-age=3600',
          ...getCorsHeaders(),
        },
      });
    }

    // For image files, return a transparent 1x1 pixel
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg'];
    const extension = url.split('.').pop()?.toLowerCase();

    if (extension && imageExtensions.includes(extension)) {
      const contentType = extension === 'svg' 
        ? 'image/svg+xml' 
        : `image/${extension === 'jpg' ? 'jpeg' : extension}`;

      // Return an empty response with the correct content type
      return new NextResponse('', {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          ...getCorsHeaders(),
        },
      });
    }

    // For any other resource, return an empty 200 response
    return new NextResponse('', {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600',
        ...getCorsHeaders(),
      },
    });

  } catch (error: any) {
    console.error('❌ Viva Engage Proxy Resource Error:', error);

    // Return a JSON error response
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to proxy resource',
        details: error.message,
      },
      { 
        status: 500,
        headers: getCorsHeaders()
      }
    );
  }
}
