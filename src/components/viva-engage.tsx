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
    console.log('VivaEngage component mounted')
    setIsClient(true)
  }, [])

  // Effect to set iframeRendered when the component is mounted on the client
  useEffect(() => {
    // This effect runs after render, so if we're on the client, we can prepare to render the iframe
    if (isClient) {
      console.log('Client-side rendering detected, preparing to render iframe');
      // We'll set iframeRendered to true immediately when on client
      // This allows the iframe to be created in the DOM (though it may be hidden by the loading overlay)
      setIframeRendered(true);
    }
  }, [isClient]);

  // Add event listeners to the iframe to detect loading and errors
  useEffect(() => {
    console.log('Setting up iframe event listeners, isClient:', isClient, 'iframeRef.current exists:', !!iframeRef.current, 'iframeRendered:', iframeRendered);

    if (isClient && iframeRef.current && iframeRendered) {
      const iframe = iframeRef.current;
      console.log('Iframe source URL:', vivaEngageUrl);
      console.log('Iframe current state - isLoading:', isLoading, 'hasError:', !!error);

      const handleLoad = () => {
        console.log('SUCCESS: Viva Engage iframe load event triggered');
        console.log('Iframe loaded successfully at:', new Date().toISOString());
        setIsLoading(false);

        // Try to check if the iframe has content
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const bodyContent = iframeDoc.body.innerHTML;
            console.log('Iframe body content length:', bodyContent.length);
            console.log('Iframe document title:', iframeDoc.title);
            console.log('Iframe document URL:', iframeDoc.URL);

            // Log a sample of the content to help diagnose issues
            if (bodyContent && bodyContent.length > 0) {
              console.log('Iframe content sample:', bodyContent.substring(0, 200) + '...');

              // Check for specific error indicators in the content
              if (bodyContent.includes('error') || bodyContent.includes('Error') || 
                  bodyContent.includes('failed') || bodyContent.includes('Failed')) {
                console.warn('Possible error detected in iframe content');
              } else {
                console.log('No error indicators found in iframe content');
              }
            } else {
              console.error('Iframe body is empty');
              setError('Iframe loaded but content appears to be empty');
            }
          } else {
            console.error('Could not access iframe document');
          }
        } catch (e) {
          console.warn('Could not access iframe content due to same-origin policy:', e);

          // Try to determine if there's a CORS issue
          if (e instanceof DOMException && e.name === 'SecurityError') {
            console.log('Security error accessing iframe content - likely a CORS issue');
            // This is expected due to same-origin policy, but the iframe should still work
            console.log('This is normal due to security restrictions, the iframe should still function');
          }
        }
      };

      const handleError = (e) => {
        console.error('ERROR: Viva Engage iframe failed to load:', e);
        console.error('Iframe error occurred at:', new Date().toISOString());
        console.error('Iframe error details:', {
          type: e.type,
          message: e.message,
          target: e.target?.src || 'unknown',
          timestamp: new Date().toISOString()
        });
        setIsLoading(false);
        setError('Failed to load Viva Engage content. Check console for details.');
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

      // Also set up a timeout to detect if loading takes too long
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          console.warn('WARNING: Viva Engage iframe loading timeout after 30 seconds');
          console.warn('Timeout occurred at:', new Date().toISOString());
          console.warn('Current iframe state:', {
            src: iframe.src,
            isLoading,
            hasError: !!error,
            iframeRendered,
            readyState: document.readyState
          });
          setError('Loading timed out. The server might be slow or unresponsive.');
        }
      }, 30000);

      // Log that we've successfully set up all event listeners
      console.log('All iframe event listeners attached successfully');

      return () => {
        console.log('Cleaning up iframe event listeners');
        iframe.removeEventListener('load', handleLoad);
        iframe.removeEventListener('error', handleError);
        window.removeEventListener('message', handleMessage);
        clearTimeout(timeoutId);
      };
    } else {
      console.log('Not setting up iframe listeners yet - waiting for client-side rendering or iframe ref');
      if (!isClient) console.log('Reason: Not on client side yet');
      if (!iframeRef.current) console.log('Reason: Iframe reference not available yet');
      if (!iframeRendered) console.log('Reason: Iframe not marked as rendered yet');
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
                  console.log('Iframe element mounted in DOM');
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
                  <div className="text-center">
                    <p className="text-red-500 font-medium mb-2">Error loading Viva Engage</p>
                    <p className="text-gray-600 text-sm mb-4">{error}</p>

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
                          console.log('Manual retry triggered from error state');
                          setIsLoading(true);
                          setError(null);

                          // Force iframe reload if it exists
                          if (iframeRef.current) {
                            console.log('Reloading iframe from error state');
                            const currentSrc = iframeRef.current.src;
                            iframeRef.current.src = '';
                            setTimeout(() => {
                              if (iframeRef.current) {
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
                      console.log('Manual reload triggered by user');
                      // Reset state
                      setIsLoading(true);
                      setError(null);

                      // Force iframe reload if it exists
                      if (iframeRef.current) {
                        console.log('Reloading iframe');
                        const currentSrc = iframeRef.current.src;
                        iframeRef.current.src = '';
                        setTimeout(() => {
                          if (iframeRef.current) {
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
