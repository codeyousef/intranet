'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * VivaEngageEmbed - A component for embedding Viva Engage (formerly Yammer) content
 * 
 * This component uses the modern iframe approach recommended by Microsoft for embedding
 * Viva Engage content, as the classic JavaScript-based embed will no longer be supported
 * after June 1, 2025.
 */
interface VivaEngageEmbedProps {
  feedType?: string;
  communityId?: string;
  height?: string;
  width?: string;
  theme?: string;
  postType?: string;
}

export function VivaEngageEmbed({ 
  feedType = 'home',
  communityId,
  height = '100%',
  width = '100%',
  theme = 'light',
  postType = 'latest' // 'latest' or 'top' - used for UI only
}: VivaEngageEmbedProps) {
  // Initialize state variables with consistent values for server and client
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [htmlContent, setHtmlContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Set isClient to true on mount to track if we're on the client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Build the API URL - this function is only called on the client side
  const buildApiUrl = () => {
    // Use our internal API proxy route instead of directly embedding from Yammer
    const url = '/api/viva-engage'

    // Add query parameters
    const params = new URLSearchParams({
      feedType: feedType || 'home',
      theme: theme || 'light',
      locale: 'en-us'
    })

    // Add communityId if it's a community feed
    if (feedType === 'community' && communityId) {
      params.append('communityId', communityId)
    }

    // Add postType parameter
    params.append('postType', postType || 'latest')

    // Add a cache-busting parameter to prevent caching issues
    params.append('_t', Date.now().toString())

    return `${url}?${params.toString()}`
  }

  // Fetch the HTML content from the API - only on client side
  useEffect(() => {
    // Skip this effect during server-side rendering
    if (!isClient) {
      return;
    }

    let isMounted = true; // Track if component is mounted

    const fetchContent = async () => {
      if (!isMounted) return; // Don't update state if component is unmounted

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(buildApiUrl())
        const data = await response.json()

        if (!isMounted) return; // Don't update state if component is unmounted

        if (data.success && data.data && data.data.html) {
          setHtmlContent(data.data.html)
        } else if (!response.ok && data.data && data.data.html) {
          // Handle error response that contains HTML content
          setHtmlContent(data.data.html)
          // Don't log to console as this is an expected case where we show the error in the iframe
        } else {
          throw new Error(data.error || 'Invalid response format')
        }
      } catch (err) {
        if (!isMounted) return; // Don't update state if component is unmounted

        console.error('Error fetching Viva Engage content:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    // Add a small delay before fetching to ensure hydration is complete
    const timer = setTimeout(() => {
      fetchContent()
    }, 50);

    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timer);
    }
  }, [feedType, communityId, theme, postType, isClient])

  // Cleanup function to handle iframe removal properly - only on client side
  useEffect(() => {
    // Only set up cleanup if we're on the client side
    if (!isClient) {
      return;
    }

    return () => {
      // Clear iframe content and references when component unmounts
      if (iframeRef.current) {
        try {
          // Set src to empty to stop any active connections
          iframeRef.current.src = 'about:blank';

          // Clear any content
          if (iframeRef.current.contentDocument) {
            try {
              iframeRef.current.contentDocument.documentElement.innerHTML = '';
            } catch (e) {
              // Ignore errors accessing contentDocument due to cross-origin restrictions
            }
          }
        } catch (e) {
          // Ignore any errors that might occur during cleanup
          console.error('Error during iframe cleanup:', e);
        }

        // Clear HTML content state
        setHtmlContent('');
      }
    };
  }, [isClient]);

  // Handle iframe load event
  const handleIframeLoad = () => {
    setIframeLoaded(true)
  }

  // Update iframe opacity when loaded
  useEffect(() => {
    if (isClient && iframeLoaded && iframeRef.current) {
      // Add a small delay to ensure the iframe content is fully rendered
      const timer = setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.classList.remove('opacity-0');
          iframeRef.current.classList.add('opacity-100');
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isClient, iframeLoaded]);

  // Always render the same structure on both server and client
  // Use CSS to control visibility
  return (
    <div style={{ width, height, position: 'relative' }}>
      {/* Loading indicator - always rendered but visibility controlled by CSS */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-50" 
           style={{ display: 'flex', visibility: (!isClient || isLoading || !iframeLoaded) ? 'visible' : 'hidden' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-flyadeal-yellow mx-auto mb-3"></div>
          <p className="text-gray-500">Loading Viva Engage...</p>
        </div>
      </div>

      {/* Error message - always rendered but visibility controlled by CSS */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-50"
           style={{ display: 'flex', visibility: (isClient && error) ? 'visible' : 'hidden' }}>
        <div className="text-center p-4 max-w-md">
          <div className="text-red-500 mb-2">Error loading Viva Engage content</div>
          <p className="text-gray-700 text-sm">{error || ''}</p>
          <button 
            onClick={() => typeof window !== 'undefined' && window.location.reload()} 
            className="mt-4 px-4 py-2 bg-flyadeal-purple text-white rounded hover:bg-opacity-90"
          >
            Retry
          </button>
        </div>
      </div>

      {/* Iframe - always rendered with the same structure, visibility controlled by CSS */}
      <div className="h-full" style={{ display: 'block', visibility: isClient ? 'visible' : 'hidden' }}>
        <iframe
          ref={iframeRef}
          srcDoc={isClient ? (htmlContent || '') : '<!DOCTYPE html><html><body></body></html>'}
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ border: 'none' }}
          title="Viva Engage Feed"
          loading="lazy"
          sandbox="allow-scripts allow-popups allow-forms allow-modals"
          onLoad={isClient ? handleIframeLoad : undefined}
          className="opacity-0 transition-opacity duration-300"
          allow="camera; microphone"
          referrerPolicy="origin"
          data-loaded={iframeLoaded ? 'true' : 'false'}
        />
      </div>
    </div>
  )
}

export default VivaEngageEmbed
