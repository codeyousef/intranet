'use client'

import { useState, useEffect } from 'react'

/**
 * VivaEngageEmbed - A component for embedding Viva Engage (formerly Yammer) content
 * 
 * This component uses the modern iframe approach recommended by Microsoft for embedding
 * Viva Engage content, as the classic JavaScript-based embed will no longer be supported
 * after June 1, 2025.
 */
export function VivaEngageEmbed({ 
  feedType = 'home',
  communityId,
  height = '100%',
  width = '100%',
  theme = 'light',
  postType = 'latest' // 'latest' or 'top' - used for UI only
}) {
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [htmlContent, setHtmlContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Build the API URL
  const buildApiUrl = () => {
    // Use our internal API proxy route instead of directly embedding from Yammer
    const url = '/api/viva-engage'

    // Add query parameters
    const params = new URLSearchParams({
      feedType: feedType,
      theme: theme,
      locale: 'en-us'
    })

    // Add communityId if it's a community feed
    if (feedType === 'community' && communityId) {
      params.append('communityId', communityId)
    }

    // Add postType parameter
    params.append('postType', postType)

    return `${url}?${params.toString()}`
  }

  // Fetch the HTML content from the API
  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(buildApiUrl())
        const data = await response.json()

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
        console.error('Error fetching Viva Engage content:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContent()
  }, [feedType, communityId, theme, postType])

  // Handle iframe load event
  const handleIframeLoad = () => {
    setIframeLoaded(true)
  }

  return (
    <div style={{ width, height, position: 'relative' }}>
      {(isLoading || !iframeLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-flyadeal-yellow mx-auto mb-3"></div>
            <p className="text-gray-500">Loading Viva Engage...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center p-4 max-w-md">
            <div className="text-red-500 mb-2">Error loading Viva Engage content</div>
            <p className="text-gray-700 text-sm">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-flyadeal-purple text-white rounded hover:bg-opacity-90"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {htmlContent && (
        <iframe
          srcDoc={htmlContent}
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ border: 'none' }}
          title="Viva Engage Feed"
          loading="lazy"
          sandbox="allow-scripts allow-popups allow-forms allow-modals"
          onLoad={handleIframeLoad}
          className={iframeLoaded ? 'opacity-100' : 'opacity-0'}
          allow="camera; microphone"
          referrerPolicy="origin"
        />
      )}
    </div>
  )
}

export default VivaEngageEmbed
