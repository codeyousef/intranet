'use client'

import { useState, useEffect } from 'react'
import { Maximize2, ExternalLink, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VivaEngageEmbed } from '@/components/viva-engage-embed'

/**
 * VivaEngage - A wrapper component for the VivaEngageEmbed component
 * 
 * This component provides a UI wrapper around the VivaEngageEmbed component,
 * adding features like fullscreen mode and an external link button.
 */

export function VivaEngage({ 
  feedType = 'home',
  communityId,
  height = '100%',
  width = '100%',
  theme = 'light' 
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [postType, setPostType] = useState('latest') // 'latest' or 'top'
  const [mounted, setMounted] = useState(false)

  // Set mounted to true on client-side
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const openInNewTab = () => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      // Use the same URL format as the embed for consistency
      let url = "https://web.yammer.com/main"

      // If it's a community feed, use the community URL
      if (feedType === 'community' && communityId) {
        url = `https://web.yammer.com/groups/${communityId}`
      }

      window.open(url, '_blank')
    }
  }

  // Always render the same structure on both server and client
  // Use CSS to control visibility
  return (
    <div 
      className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg overflow-hidden h-[calc(100%-2.5rem)]`}
      style={{
        position: 'relative',
        ...(mounted && isFullscreen ? {
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          height: '100%'
        } : {})
      }}
    >
      {/* Fullscreen header - always rendered but visibility controlled by CSS */}
      <div 
        className="bg-flyadeal-purple p-3 text-white flex items-center justify-between"
        style={{ display: 'flex', visibility: (mounted && isFullscreen) ? 'visible' : 'hidden', height: (mounted && isFullscreen) ? 'auto' : 0 }}
      >
        <h3 className="font-medium">Viva Engage</h3>
        <div className="flex items-center space-x-2">
          {/* Post type toggle */}
          <div className="flex rounded-md overflow-hidden border border-white/30">
            <button
              onClick={() => setPostType('latest')}
              className="px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: postType === 'latest' ? 'white' : 'transparent',
                color: postType === 'latest' ? 'var(--flyadeal-purple)' : 'white'
              }}
            >
              Latest
            </button>
            <button
              onClick={() => setPostType('top')}
              className="px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: postType === 'top' ? 'white' : 'transparent',
                color: postType === 'top' ? 'var(--flyadeal-purple)' : 'white'
              }}
            >
              Top
            </button>
          </div>
          <Button
            onClick={toggleFullscreen}
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="h-full relative">
        {/* Non-fullscreen controls - always rendered but visibility controlled by CSS */}
        <div 
          className="absolute top-4 left-4 z-10 flex rounded-md overflow-hidden border border-gray-300 bg-white/80 backdrop-blur-sm shadow-sm"
          style={{ display: 'flex', visibility: (mounted && !isFullscreen) ? 'visible' : 'hidden' }}
        >
          <button
            onClick={() => setPostType('latest')}
            className="px-3 py-1 text-xs font-medium"
            style={{
              backgroundColor: postType === 'latest' 
                ? 'var(--flyadeal-yellow)' 
                : theme === 'dark' ? 'rgb(55, 65, 81)' : 'rgb(243, 244, 246)',
              color: postType === 'latest' 
                ? 'var(--flyadeal-purple)' 
                : theme === 'dark' ? 'rgb(209, 213, 219)' : 'rgb(75, 85, 99)'
            }}
          >
            Latest
          </button>
          <button
            onClick={() => setPostType('top')}
            className="px-3 py-1 text-xs font-medium"
            style={{
              backgroundColor: postType === 'top' 
                ? 'var(--flyadeal-yellow)' 
                : theme === 'dark' ? 'rgb(55, 65, 81)' : 'rgb(243, 244, 246)',
              color: postType === 'top' 
                ? 'var(--flyadeal-purple)' 
                : theme === 'dark' ? 'rgb(209, 213, 219)' : 'rgb(75, 85, 99)'
            }}
          >
            Top
          </button>
        </div>
        <VivaEngageEmbed 
          feedType={feedType}
          communityId={communityId}
          height="100%"
          width="100%"
          theme={theme}
          postType={postType}
        />
      </div>

      {/* Bottom controls - always rendered but visibility controlled by CSS */}
      <div 
        className="absolute bottom-4 right-4 flex space-x-2"
        style={{ display: 'flex', visibility: (mounted && !isFullscreen) ? 'visible' : 'hidden' }}
      >
        <Button
          onClick={openInNewTab}
          size="sm"
          variant="outline"
          className="border"
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(55, 65, 81, 0.1)' : 'rgba(255, 255, 255, 0.1)',
            borderColor: theme === 'dark' ? 'rgb(75, 85, 99)' : 'rgb(209, 213, 219)',
            color: theme === 'dark' ? 'rgb(209, 213, 219)' : 'rgb(55, 65, 81)'
          }}
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
    </div>
  )
}
