'use client'

import { useState, useEffect, useRef } from 'react'
import { Maximize2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function VivaEngage() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [iframeRendered, setIframeRendered] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // URL for Viva Engage (Yammer) web part
  // Using our proxy API to avoid Content Security Policy issues
  const vivaEngageUrl = "/api/viva-engage"

  // Check if we're running in the browser
  useEffect(() => {
    console.log('[VivaEngage] Component mounted', {
      timestamp: new Date().toISOString(),
      environment: typeof window !== 'undefined' ? 'browser' : 'server'
    });
    setIsClient(true);
  }, []);

  // Effect to set iframeRendered when the component is mounted on the client
  useEffect(() => {
    // This effect runs after render, so if we're on the client, we can prepare to render the iframe
    if (isClient) {
      console.log('[VivaEngage] Client-side rendering detected', {
        timestamp: new Date().toISOString(),
        readyState: document.readyState,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        userAgent: navigator.userAgent
      });

      // We'll set iframeRendered to true immediately when on client
      // This allows the iframe to be created in the DOM (though it may be hidden by the loading overlay)
      setIframeRendered(true);
    }
  }, [isClient]);

  // Add event listeners to the iframe to detect loading and errors
  useEffect(() => {
    console.log('[VivaEngage] Setting up iframe event listeners', {
      timestamp: new Date().toISOString(),
      isClient,
      iframeRefExists: !!iframeRef.current,
      iframeRendered,
      isLoading,
      hasError: !!error
    });

    if (isClient && iframeRef.current && iframeRendered) {
      const iframe = iframeRef.current;
      console.log('[VivaEngage] Iframe configuration', {
        sourceUrl: vivaEngageUrl,
        currentState: { isLoading, hasError: !!error },
        timestamp: new Date().toISOString()
      });

      const handleLoad = () => {
        const loadTimestamp = new Date().toISOString();
        console.log('[VivaEngage] SUCCESS: Iframe load event triggered', {
          timestamp: loadTimestamp,
          url: vivaEngageUrl
        });

        setIsLoading(false);

        // Try to check if the iframe has content
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const bodyContent = iframeDoc.body.innerHTML;

            console.log('[VivaEngage] Iframe content details', {
              contentLength: bodyContent?.length || 0,
              documentTitle: iframeDoc.title,
              documentURL: iframeDoc.URL,
              timestamp: loadTimestamp
            });

            // Log a sample of the content to help diagnose issues
            if (bodyContent && bodyContent.length > 0) {
              console.log('[VivaEngage] Iframe content sample:', bodyContent.substring(0, 200) + '...');

              // Check for specific error indicators in the content
              if (bodyContent.includes('error') || bodyContent.includes('Error') || 
                  bodyContent.includes('failed') || bodyContent.includes('Failed')) {
                console.warn('[VivaEngage] WARNING: Possible error detected in iframe content', {
                  indicators: ['error', 'Error', 'failed', 'Failed'].filter(term => bodyContent.includes(term)),
                  timestamp: loadTimestamp
                });
              } else {
                console.log('[VivaEngage] No error indicators found in iframe content');
              }
            } else {
              console.error('[VivaEngage] ERROR: Iframe body is empty', {
                timestamp: loadTimestamp,
                documentTitle: iframeDoc.title,
                documentURL: iframeDoc.URL
              });
              setError('Iframe loaded but content appears to be empty. This might indicate an authentication or permission issue.');
            }
          } else {
            console.error('[VivaEngage] ERROR: Could not access iframe document', {
              timestamp: loadTimestamp
            });
          }
        } catch (e) {
          console.warn('[VivaEngage] Could not access iframe content due to same-origin policy', {
            error: e.message,
            errorType: e.name,
            timestamp: loadTimestamp
          });

          // Try to determine if there's a CORS issue
          if (e instanceof DOMException && e.name === 'SecurityError') {
            console.log('[VivaEngage] Security error accessing iframe content - likely a CORS issue');
            console.log('[VivaEngage] This is normal due to security restrictions, the iframe should still function');
          }
        }
      };

      const handleError = (e) => {
        // Get detailed information about the current state
        const detailedError = {
          type: e.type,
          message: e.message || 'No error message available',
          target: e.target?.src || 'unknown',
          timestamp: new Date().toISOString(),
          documentReadyState: document.readyState,
          iframeAttributes: iframe ? {
            src: iframe.src,
            width: iframe.width,
            height: iframe.height,
            id: iframe.id,
            name: iframe.name
          } : 'No iframe reference',
          networkState: navigator.onLine ? 'Online' : 'Offline',
          userAgent: navigator.userAgent
        };

        console.error('[VivaEngage] CRITICAL: Iframe failed to load', detailedError);

        // Check for authentication issues
        let isAuthError = false;
        let errorMessage = `Failed to load Viva Engage content. Error: ${detailedError.message || e.type || 'Unknown error'}. Check browser console for details.`;

        // Try to fetch the iframe URL directly to see if it's accessible
        fetch(vivaEngageUrl)
          .then(response => {
            console.log(`[VivaEngage] API endpoint check: ${vivaEngageUrl} is ${response.ok ? 'accessible' : 'inaccessible'} (${response.status})`);

            // Check if it's an authentication error
            if (response.status === 401 || response.status === 403) {
              isAuthError = true;
              errorMessage = 'Authentication required: You need to sign in to access Viva Engage content.';
              console.warn('[VivaEngage] Authentication error detected from API response');
            } else if (response.status === 500) {
              console.error('[VivaEngage] Server error (500) detected from API response');

              // For 500 errors, we'll assume it might be an auth issue since that's a common cause
              // This makes the UI more user-friendly by encouraging sign-in rather than showing a generic error
              isAuthError = true;
              errorMessage = 'Authentication required: You need to sign in to access Viva Engage content.';
            }

            // Try to get more details from the response
            return response.text().catch(() => null);
          })
          .then(text => {
            if (text) {
              console.log(`[VivaEngage] API response text (first 200 chars): ${text.substring(0, 200)}`);

              // Check for auth error indicators in the response text
              if (text.includes('authentication') || text.includes('auth') || 
                  text.includes('login') || text.includes('sign in') ||
                  text.includes('unauthorized') || text.includes('not authorized') ||
                  text.includes('token') || text.includes('session')) {
                isAuthError = true;
                errorMessage = 'Authentication error: You may need to sign in again to access Viva Engage content.';
                console.warn('[VivaEngage] Authentication error indicators found in response text');
              }

              // Check for server error indicators
              if (text.includes('500') || text.includes('Internal Server Error') ||
                  text.includes('server error') || text.includes('NEXTAUTH_SECRET')) {
                console.error('[VivaEngage] Server error indicators found in response text');
                errorMessage = 'Server configuration error: The server is not properly configured for authentication. Please contact support.';
              }
            }

            // Also check the health endpoint to see if there are auth issues
            return fetch('/api/health-check').then(r => r.json()).catch(() => null);
          })
          .then(healthData => {
            if (healthData) {
              console.log('[VivaEngage] Health check data:', healthData);

              // Check for auth session availability
              if (!healthData.diagnostics?.auth?.sessionAvailable) {
                isAuthError = true;
                errorMessage = 'Authentication required: You need to sign in to access Viva Engage content.';
                console.warn('[VivaEngage] No valid session according to health check');
              }

              // Check for missing environment variables
              const authConfig = healthData.diagnostics?.auth?.configPresent || {};
              const missingVars = [];

              if (!authConfig.clientId) missingVars.push('AZURE_AD_CLIENT_ID');
              if (!authConfig.clientSecret) missingVars.push('AZURE_AD_CLIENT_SECRET');
              if (!authConfig.tenantId) missingVars.push('AZURE_AD_TENANT_ID');
              if (!authConfig.nextAuthSecret) missingVars.push('NEXTAUTH_SECRET');

              if (missingVars.length > 0) {
                console.error('[VivaEngage] Missing required environment variables:', missingVars.join(', '));
                errorMessage = `Server configuration error: Missing required environment variables (${missingVars.join(', ')}). Please contact support.`;
              }

              // Check for session error
              if (healthData.diagnostics?.auth?.sessionCheckError) {
                console.error('[VivaEngage] Session check error:', healthData.diagnostics.auth.sessionCheckError);
                errorMessage = 'Authentication error: There was a problem checking your session. Please try signing out and back in.';
              }
            }

            // Set the error state with the appropriate message
            setIsLoading(false);
            setError(errorMessage);

            // If it's an auth error, provide a sign-out link in the console for easy access
            if (isAuthError) {
              console.info('[VivaEngage] To fix authentication issues, try signing out and back in: /api/auth/signout');
            }
          })
          .catch(fetchError => {
            console.error(`[VivaEngage] API endpoint check failed: ${vivaEngageUrl}`, {
              error: fetchError.message,
              timestamp: new Date().toISOString()
            });

            // Set the error state with a generic message
            setIsLoading(false);
            setError(errorMessage);
          });
      };

      // Log when we're attaching event listeners
      console.log('Attaching load and error event listeners to iframe');
      iframe.addEventListener('load', handleLoad);
      iframe.addEventListener('error', handleError);

      // Also listen for message events from the iframe
      const handleMessage = (event) => {
        console.log('Received message from iframe:', event.origin, event.data);
        // We could process messages from the iframe here if needed
      };
      window.addEventListener('message', handleMessage);

      // Set up multiple timeouts to provide progressive feedback
      const timeoutIds = [];

      // First timeout - warning after 10 seconds
      timeoutIds.push(setTimeout(() => {
        if (isLoading) {
          console.warn('[VivaEngage] WARNING: Iframe loading taking longer than expected (10s)', {
            url: vivaEngageUrl,
            timestamp: new Date().toISOString(),
            readyState: document.readyState,
            networkState: navigator.onLine ? 'Online' : 'Offline'
          });

          // Check network connectivity and auth status
          fetch('/api/health-check')
            .then(response => response.json())
            .then(healthData => {
              console.log(`[VivaEngage] Health check: API is ${healthData.status === 'ok' ? 'responsive' : 'having issues'}`, {
                timestamp: healthData.timestamp,
                environment: healthData.environment,
                authConfig: healthData.diagnostics?.auth?.configPresent,
                sessionAvailable: healthData.diagnostics?.auth?.sessionAvailable,
                sessionError: healthData.diagnostics?.auth?.sessionCheckError,
                sessionDetails: healthData.diagnostics?.auth?.sessionDetails
              });

              // Log more detailed information if there's an auth issue
              if (!healthData.diagnostics?.auth?.sessionAvailable) {
                console.warn('[VivaEngage] Auth session not available, this may cause loading issues');

                // Check for missing environment variables
                const missingVars = [];
                const authConfig = healthData.diagnostics?.auth?.configPresent || {};
                if (!authConfig.clientId) missingVars.push('AZURE_AD_CLIENT_ID');
                if (!authConfig.clientSecret) missingVars.push('AZURE_AD_CLIENT_SECRET');
                if (!authConfig.tenantId) missingVars.push('AZURE_AD_TENANT_ID');
                if (!authConfig.nextAuthSecret) missingVars.push('NEXTAUTH_SECRET');

                if (missingVars.length > 0) {
                  console.error('[VivaEngage] Missing required environment variables:', missingVars.join(', '));
                }
              }
            })
            .catch(error => {
              console.error('[VivaEngage] Health check failed, possible network issues:', error.message);
            });
        }
      }, 10000));

      // Second timeout - error after 30 seconds
      timeoutIds.push(setTimeout(() => {
        if (isLoading) {
          const timeoutInfo = {
            url: vivaEngageUrl,
            timestamp: new Date().toISOString(),
            src: iframe.src,
            isLoading,
            hasError: !!error,
            iframeRendered,
            readyState: document.readyState,
            networkState: navigator.onLine ? 'Online' : 'Offline',
            userAgent: navigator.userAgent
          };

          console.error('[VivaEngage] ERROR: Iframe loading timeout after 30 seconds', timeoutInfo);

          // Try to fetch the iframe URL directly to see if it's accessible
          fetch(vivaEngageUrl, { method: 'HEAD' })
            .then(response => {
              console.log(`[VivaEngage] Timeout recovery - API endpoint check: ${vivaEngageUrl} is ${response.ok ? 'accessible' : 'inaccessible'} (${response.status})`);
            })
            .catch(fetchError => {
              console.error(`[VivaEngage] Timeout recovery - API endpoint check failed: ${vivaEngageUrl}`, {
                error: fetchError.message,
                timestamp: new Date().toISOString()
              });
            });

          setError('Loading timed out after 30 seconds. The server might be slow or unresponsive. Check your network connection and try again.');
        }
      }, 30000));

      // Log that we've successfully set up all event listeners
      console.log('[VivaEngage] All iframe event listeners and timeouts attached successfully', {
        timestamp: new Date().toISOString(),
        timeoutsCount: timeoutIds.length
      });

      return () => {
        console.log('[VivaEngage] Cleaning up iframe event listeners and timeouts');
        iframe.removeEventListener('load', handleLoad);
        iframe.removeEventListener('error', handleError);
        window.removeEventListener('message', handleMessage);

        // Clear all timeout IDs
        timeoutIds.forEach(id => clearTimeout(id));

        console.log('[VivaEngage] Cleanup complete');
      };
    } else {
      const reasons = [];
      if (!isClient) reasons.push('Not on client side yet');
      if (!iframeRef.current) reasons.push('Iframe reference not available yet');
      if (!iframeRendered) reasons.push('Iframe not marked as rendered yet');

      console.log('[VivaEngage] Waiting for prerequisites before setting up iframe listeners', {
        timestamp: new Date().toISOString(),
        isClient,
        iframeRefExists: !!iframeRef.current,
        iframeRendered,
        reasons
      });
    }
  }, [isClient, vivaEngageUrl, isLoading, iframeRendered, error]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const openInNewTab = () => {
    // Open the actual Viva Engage URL, not our proxy
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      window.open("https://web.yammer.com/embed/groups", '_blank')
    }
  }

  return (
    <div className={`bg-white rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100%-2.5rem)]'}`}>
      {isFullscreen && (
        <div className="bg-flyadeal-purple p-3 text-white flex items-center justify-between">
          <h3 className="font-medium">Viva Engage</h3>
          <Button
            onClick={toggleFullscreen}
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className={`${isFullscreen ? 'h-[calc(100%-48px)]' : 'h-full'}`}>
        {!isClient ? (
          // Initial loading state before client-side rendering
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <p className="text-gray-500">Loading Viva Engage...</p>
          </div>
        ) : (
          // Client-side rendering - always render the iframe but conditionally show overlays
          <div className="relative w-full h-full">
            {/* Always render the iframe when on client-side */}
            <iframe 
              ref={(el) => {
                iframeRef.current = el;
                if (el) {
                  console.log('[VivaEngage] Iframe element mounted in DOM', {
                    timestamp: new Date().toISOString(),
                    iframeId: el.id || 'no-id',
                    iframeSrc: el.src || 'no-src-yet'
                  });
                  setIframeRendered(true);
                }
              }}
              src={vivaEngageUrl}
              frameBorder="0" 
              className="w-full h-full"
              title="Viva Engage Feed"
              style={{ opacity: isLoading && !error ? 0 : 1 }} // Hide iframe while loading
            ></iframe>

            {/* Error overlay */}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 p-4">
                <div className={`${error.includes('Authentication') ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4 max-w-md`}>
                  <div className="text-center">
                    <p className={`${error.includes('Authentication') ? 'text-yellow-700' : 'text-red-500'} font-medium mb-2`}>
                      {error.includes('Authentication') ? 'Authentication Required' : 'Error loading Viva Engage'}
                    </p>
                    <p className="text-gray-600 text-sm mb-4">
                      {error.includes('Authentication') 
                        ? 'You need to be signed in to access Viva Engage content.' 
                        : error}
                    </p>

                    {error && error.includes('Authentication') && (
                      <div className="bg-white border border-yellow-100 rounded-lg p-3 mb-4 text-left">
                        <p className="text-gray-700 font-medium text-sm mb-2">Please sign in to continue</p>
                        <p className="text-gray-600 text-xs mb-2">To access Viva Engage content, you need to:</p>
                        <ol className="text-xs text-gray-600 list-decimal pl-4 space-y-1">
                          <li>Sign in with your Microsoft account</li>
                          <li>Make sure you have the necessary permissions</li>
                          <li>Contact IT support if you continue to have issues</li>
                        </ol>
                        <div className="mt-3 flex justify-center">
                          <a href="/api/auth/signin" className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-flyadeal-purple rounded-md hover:bg-flyadeal-purple/90">
                            Sign in with Microsoft
                          </a>
                        </div>
                      </div>
                    )}

                    {error && error.includes('timed out') && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-left">
                        <p className="text-blue-700 font-medium text-sm mb-2">Network Issue Detected</p>
                        <p className="text-gray-600 text-xs mb-2">This appears to be a network or server issue. Please try:</p>
                        <ol className="text-xs text-gray-600 list-decimal pl-4 space-y-1">
                          <li>Checking your internet connection</li>
                          <li>Refreshing the page</li>
                          <li>Trying again in a few minutes</li>
                        </ol>
                      </div>
                    )}

                    <div className="bg-gray-50 rounded p-3 mb-4 text-left">
                      <p className="text-xs text-gray-500 mb-1">Debugging Information:</p>
                      <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
                        <li>Time: {new Date().toLocaleTimeString()}</li>
                        <li>URL: {vivaEngageUrl}</li>
                        <li>Client Rendered: {isClient ? 'Yes' : 'No'}</li>
                        <li>Iframe Rendered: {iframeRendered ? 'Yes' : 'No'}</li>
                        <li>
                          <button 
                            onClick={() => {
                              console.log('Copying debug info to clipboard');
                              const debugInfo = `
Viva Engage Debug Info:
- Time: ${new Date().toISOString()}
- Error: ${error}
- URL: ${vivaEngageUrl}
- Client Rendered: ${isClient ? 'Yes' : 'No'}
- Iframe Rendered: ${iframeRendered ? 'Yes' : 'No'}
- Browser: ${navigator.userAgent}
                              `;
                              navigator.clipboard.writeText(debugInfo)
                                .then(() => alert('Debug info copied to clipboard'))
                                .catch(err => console.error('Failed to copy debug info:', err));
                            }}
                            className="text-blue-500 hover:underline"
                          >
                            Copy Debug Info
                          </button>
                        </li>
                      </ul>
                    </div>

                    <div className="flex justify-center space-x-2">
                      <Button 
                        onClick={() => {
                          const retryTimestamp = new Date().toISOString();
                          console.log('[VivaEngage] Manual retry triggered from error state', {
                            timestamp: retryTimestamp,
                            previousError: error,
                            iframeExists: !!iframeRef.current
                          });

                          setIsLoading(true);
                          setError(null);

                          // Force iframe reload if it exists
                          if (iframeRef.current) {
                            console.log('[VivaEngage] Reloading iframe from error state', {
                              timestamp: retryTimestamp,
                              currentSrc: iframeRef.current.src
                            });

                            const currentSrc = iframeRef.current.src;
                            iframeRef.current.src = '';
                            setTimeout(() => {
                              if (iframeRef.current) {
                                console.log('[VivaEngage] Setting new src after error state retry', {
                                  timestamp: new Date().toISOString(),
                                  newSrc: currentSrc
                                });
                                iframeRef.current.src = currentSrc;
                              }
                            }, 100);
                          }
                        }}
                        size="sm"
                        className="bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90"
                      >
                        Retry
                      </Button>
                      <Button
                        onClick={openInNewTab}
                        size="sm"
                        variant="outline"
                        className="border-gray-300 text-gray-600 hover:bg-gray-100"
                      >
                        Open in Browser
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading overlay */}
            {isLoading && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-flyadeal-yellow mx-auto mb-3"></div>
                  <p className="text-gray-500">Loading Viva Engage...</p>
                  <p className="text-gray-400 text-xs mt-2">If loading takes too long, check the browser console for errors.</p>
                  <button 
                    onClick={() => {
                      const reloadTimestamp = new Date().toISOString();
                      console.log('[VivaEngage] Manual reload triggered by user from loading state', {
                        timestamp: reloadTimestamp,
                        currentLoadingState: isLoading,
                        iframeExists: !!iframeRef.current,
                        iframeSrc: iframeRef.current?.src || 'no-src'
                      });

                      // Reset state
                      setIsLoading(true);
                      setError(null);

                      // Force iframe reload if it exists
                      if (iframeRef.current) {
                        console.log('[VivaEngage] Reloading iframe from loading state', {
                          timestamp: reloadTimestamp,
                          currentSrc: iframeRef.current.src
                        });

                        const currentSrc = iframeRef.current.src;
                        iframeRef.current.src = '';
                        setTimeout(() => {
                          if (iframeRef.current) {
                            console.log('[VivaEngage] Setting new src after loading state retry', {
                              timestamp: new Date().toISOString(),
                              newSrc: currentSrc
                            });
                            iframeRef.current.src = currentSrc;
                          }
                        }, 100);
                      }
                    }}
                    className="mt-4 px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                  >
                    Retry Loading
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!isFullscreen && (
        <div className="absolute bottom-4 right-4 flex space-x-2">
          <Button
            onClick={openInNewTab}
            size="sm"
            variant="outline"
            className="bg-white/10 border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Open
          </Button>
          <Button
            onClick={toggleFullscreen}
            size="sm"
            className="bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90"
          >
            <Maximize2 className="w-4 h-4 mr-1" />
            Expand
          </Button>
        </div>
      )}
    </div>
  )
}
