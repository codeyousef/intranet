'use client'

import { useState } from 'react'
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

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const openInNewTab = () => {
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

  return (
    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100%-2.5rem)]'}`}>
      {isFullscreen && (
        <div className="bg-flyadeal-purple p-3 text-white flex items-center justify-between">
          <h3 className="font-medium">Viva Engage</h3>
          <div className="flex items-center space-x-2">
            {/* Post type toggle */}
            <div className="flex rounded-md overflow-hidden border border-white/30">
              <button
                onClick={() => setPostType('latest')}
                className={`px-3 py-1 text-xs font-medium ${
                  postType === 'latest' 
                    ? 'bg-white text-flyadeal-purple' 
                    : 'bg-transparent text-white hover:bg-white/20'
                }`}
              >
                Latest
              </button>
              <button
                onClick={() => setPostType('top')}
                className={`px-3 py-1 text-xs font-medium ${
                  postType === 'top' 
                    ? 'bg-white text-flyadeal-purple' 
                    : 'bg-transparent text-white hover:bg-white/20'
                }`}
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
      )}

      <div className={`${isFullscreen ? 'h-[calc(100%-48px)]' : 'h-full'} relative`}>
        {!isFullscreen && (
          <div className="absolute top-4 left-4 z-10 flex rounded-md overflow-hidden border border-gray-300 bg-white/80 backdrop-blur-sm shadow-sm">
            <button
              onClick={() => setPostType('latest')}
              className={`px-3 py-1 text-xs font-medium ${
                postType === 'latest' 
                  ? 'bg-flyadeal-yellow text-flyadeal-purple' 
                  : `${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`
              }`}
            >
              Latest
            </button>
            <button
              onClick={() => setPostType('top')}
              className={`px-3 py-1 text-xs font-medium ${
                postType === 'top' 
                  ? 'bg-flyadeal-yellow text-flyadeal-purple' 
                  : `${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`
              }`}
            >
              Top
            </button>
          </div>
        )}
        <VivaEngageEmbed 
          feedType={feedType}
          communityId={communityId}
          height="100%"
          width="100%"
          theme={theme}
          postType={postType}
        />
      </div>

      {!isFullscreen && (
        <div className="absolute bottom-4 right-4 flex space-x-2">
          <Button
            onClick={openInNewTab}
            size="sm"
            variant="outline"
            className={`${theme === 'dark' ? 'bg-gray-700/10 border-gray-600 text-gray-300 hover:bg-gray-600' : 'bg-white/10 border-gray-300 text-gray-700 hover:bg-gray-100'}`}
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
