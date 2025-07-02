'use client'

import { useState, useEffect } from 'react'
import { Maximize2, ExternalLink, MessageSquare, User, Calendar, ThumbsUp, RefreshCw, AlertCircle, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { signOut } from 'next-auth/react'

// Mock data for fallback when API fails
const MOCK_COMMUNITIES = [
  {
    id: 'mock-community-1',
    name: 'General Announcements',
    description: 'Company-wide announcements and news'
  },
  {
    id: 'mock-community-2',
    name: 'IT Department',
    description: 'IT updates, maintenance notices, and help'
  },
  {
    id: 'mock-community-3',
    name: 'HR Updates',
    description: 'Human Resources announcements and policies'
  },
  {
    id: 'mock-community-4',
    name: 'Flight Operations',
    description: 'Updates for flight crew and operations staff'
  }
]

const MOCK_POSTS = [
  {
    id: 'mock-post-1',
    title: 'Welcome to Viva Engage',
    content: 'This is a sample post showing what content would look like when the API is working correctly.',
    createdDateTime: new Date(Date.now() - 3600000).toISOString(),
    lastReplyDateTime: new Date(Date.now() - 1800000).toISOString(),
    replyCount: 5,
    author: {
      name: 'Demo User',
      email: 'demo@example.com'
    }
  },
  {
    id: 'mock-post-2',
    title: 'How to access Viva Engage directly',
    content: 'You can access Viva Engage directly by clicking the "Open" button below or visiting web.yammer.com/main',
    createdDateTime: new Date(Date.now() - 86400000).toISOString(),
    lastReplyDateTime: new Date(Date.now() - 43200000).toISOString(),
    replyCount: 2,
    author: {
      name: 'System Admin',
      email: 'admin@example.com'
    }
  }
]

export function VivaEngage({ 
  feedType = 'home',
  communityId,
  height = '100%',
  width = '100%',
  theme = 'light' 
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [useMockData, setUseMockData] = useState(false)
  const [showPermissionsInfo, setShowPermissionsInfo] = useState(false)

  // Fetch data from our API route
  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    setUseMockData(false)
    setShowPermissionsInfo(false)

    try {
      // Build the API URL with query parameters
      const params = new URLSearchParams({ feedType })
      if (feedType === 'community' && communityId) {
        params.append('communityId', communityId)
      }

      const response = await fetch(`/api/viva-engage-graph?${params.toString()}`)

      // Check for 401 Unauthorized specifically
      if (response.status === 401) {
        console.log('Received 401 Unauthorized, attempting to refresh token')

        // Try to refresh the token first
        try {
          const refreshResponse = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          })

          const refreshData = await refreshResponse.json()

          if (refreshResponse.ok && refreshData.success) {
            console.log('Token refreshed successfully, retrying request')

            // Retry the original request with the new token
            const retryResponse = await fetch(`/api/viva-engage-graph?${params.toString()}`)

            if (retryResponse.ok) {
              const retryResult = await retryResponse.json()

              if (retryResult.success) {
                console.log('Request succeeded after token refresh')
                setData(retryResult.data)
                setIsLoading(false)
                return
              }
            }

            console.log('Request still failed after token refresh')
          } else {
            console.log('Token refresh failed:', refreshData.error || 'Unknown error')
          }
        } catch (refreshError) {
          console.error('Error during token refresh:', refreshError)
        }

        // If we get here, token refresh didn't work, fall back to mock data
        console.log('Using mock data due to 401 Unauthorized response')
        setUseMockData(true)
        setShowPermissionsInfo(true)

        // Create mock data based on the feed type
        const mockData = {
          type: feedType,
          ...(feedType === 'community' 
            ? { communityId, posts: MOCK_POSTS } 
            : { communities: MOCK_COMMUNITIES })
        }

        setData(mockData)
        setError('Authentication error: You need to consent to the new Graph API permissions')
        setIsLoading(false)
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch Viva Engage data')
      }

      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.message || 'Failed to fetch Viva Engage data')
      }
    } catch (err) {
      console.error('Error fetching Viva Engage data:', err)

      // If it's an authentication error, use mock data
      if (err.message && (
        err.message.includes('Authentication') || 
        err.message.includes('401') || 
        err.message.includes('Unauthorized') ||
        err.message.includes('token')
      )) {
        console.log('Using mock data due to authentication error')
        setUseMockData(true)
        setShowPermissionsInfo(true)

        // Create mock data based on the feed type
        const mockData = {
          type: feedType,
          ...(feedType === 'community' 
            ? { communityId, posts: MOCK_POSTS } 
            : { communities: MOCK_COMMUNITIES })
        }

        setData(mockData)
        setError('Authentication error: You need to consent to the new Graph API permissions')
        return // Return early to prevent the generic error message from overriding our specific one
      }

      setError(err.message || 'An error occurred while fetching data')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [feedType, communityId])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const openInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open("https://web.yammer.com/embed/groups", '_blank')
    }
  }

  const handleRefresh = () => {
    fetchData()
  }

  // Render a community card
  const renderCommunityCard = (community) => (
    <div key={community.id} className={`p-4 border ${theme === 'dark' ? 'border-gray-700 bg-gray-700/50 hover:bg-gray-700' : 'border-gray-200 bg-white/50 hover:bg-white'} rounded-lg transition-colors`}>
      <h3 className={`font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{community.name}</h3>
      {community.description && (
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mt-1`}>{community.description}</p>
      )}
      <div className="mt-3 flex justify-end">
        <Button 
          size="sm" 
          variant="outline"
          className={`text-xs ${theme === 'dark' ? 'border-gray-600 text-gray-200 hover:bg-gray-600' : ''}`}
          onClick={() => window.open(`https://web.yammer.com/main/groups/${community.id}`, '_blank')}
        >
          <MessageSquare className="w-3 h-3 mr-1" />
          View Community
        </Button>
      </div>
    </div>
  )

  // Render a post card
  const renderPostCard = (post) => (
    <div key={post.id} className={`p-4 border ${theme === 'dark' ? 'border-gray-700 bg-gray-700/50 hover:bg-gray-700' : 'border-gray-200 bg-white/50 hover:bg-white'} rounded-lg transition-colors mb-3`}>
      {post.author && (
        <div className="flex items-center mb-2">
          <div className={`w-8 h-8 rounded-full ${theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-600'} flex items-center justify-center`}>
            <User className="w-4 h-4" />
          </div>
          <div className="ml-2">
            <div className={`font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{post.author.name}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {post.createdDateTime && formatDistanceToNow(new Date(post.createdDateTime), { addSuffix: true })}
            </div>
          </div>
        </div>
      )}

      <h3 className={`font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{post.title}</h3>
      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mt-1`}>{post.content}</p>

      <div className={`mt-3 flex items-center justify-between text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        <div className="flex items-center">
          <ThumbsUp className="w-3 h-3 mr-1" />
          <span>Like</span>
        </div>

        <div className="flex items-center">
          <MessageSquare className="w-3 h-3 mr-1" />
          <span>{post.replyCount || 0} replies</span>
        </div>

        {post.lastReplyDateTime && (
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            <span>Last reply {formatDistanceToNow(new Date(post.lastReplyDateTime), { addSuffix: true })}</span>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100%-2.5rem)]'}`}>
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

      <div className={`${isFullscreen ? 'h-[calc(100%-48px)]' : 'h-full'} overflow-y-auto p-4`}>
        {/* Header with refresh button */}
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
            {feedType === 'community' ? 'Community Posts' : 'Your Communities'}
          </h3>
          <Button
            onClick={handleRefresh}
            size="sm"
            variant="ghost"
            className={`${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-flyadeal-yellow mx-auto mb-3"></div>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Loading Viva Engage...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className={`${theme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
            <div className="text-center">
              <p className={`${theme === 'dark' ? 'text-red-400' : 'text-red-500'} font-medium mb-2`}>Error loading Viva Engage</p>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} text-sm mb-4`}>{error}</p>

              {showPermissionsInfo && (
                <div className={`${theme === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 mb-4 text-left`}>
                  <div className="flex items-start">
                    <AlertCircle className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} mt-0.5 mr-2 flex-shrink-0`} />
                    <div>
                      <p className={`${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'} font-medium mb-2`}>Permissions Consent Required</p>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} text-sm mb-2`}>
                        The necessary Graph API permissions have been added, but you need to consent to them.
                        You're seeing mock data until you complete this step.
                      </p>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} text-sm mb-2`}>
                        The following Microsoft Graph permissions are now available:
                      </p>
                      <ul className={`list-disc pl-5 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                        <li>Group.Read.All</li>
                        <li>User.Read.All</li>
                      </ul>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} text-sm font-medium`}>
                        To access Viva Engage data, please sign out and sign back in to consent to these permissions.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center space-x-3">
                <Button 
                  onClick={handleRefresh}
                  size="sm"
                  className="bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Retry
                </Button>

                {showPermissionsInfo && (
                  <Button
                    onClick={() => signOut({ callbackUrl: window.location.href })}
                    size="sm"
                    className="bg-blue-500 text-white hover:bg-blue-600"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Sign Out
                  </Button>
                )}

                {useMockData && (
                  <Button
                    onClick={openInNewTab}
                    size="sm"
                    variant="outline"
                    className="border-gray-300 text-gray-600 hover:bg-gray-100"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open in Browser
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Data display */}
        {!isLoading && data && (
          <div>
            {/* Mock data notice */}
            {useMockData && !error && (
              <div className={`${theme === 'dark' ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-4 mb-4`}>
                <div className="flex items-start">
                  <AlertCircle className={`w-4 h-4 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'} mt-0.5 mr-2 flex-shrink-0`} />
                  <div className="flex-1">
                    <div className="mb-2">
                      <p className={`${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'} text-sm`}>
                        Showing sample data. The necessary permissions have been added.
                      </p>
                      <p className={`${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'} text-sm font-medium`}>
                        Please sign out and sign back in to consent to the new permissions.
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={() => signOut({ callbackUrl: window.location.href })}
                        size="sm"
                        className="bg-blue-500 text-white hover:bg-blue-600"
                      >
                        <LogOut className="w-3 h-3 mr-1" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {data.type === 'home' && data.communities && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.communities.map(community => renderCommunityCard(community))}
              </div>
            )}

            {data.type === 'community' && data.posts && (
              <div className="space-y-4">
                {data.posts.length > 0 ? (
                  data.posts.map(post => renderPostCard(post))
                ) : (
                  <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} py-8`}>
                    <MessageSquare className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-300'}`} />
                    <p>No posts found in this community</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!data || 
          (data.type === 'home' && (!data.communities || data.communities.length === 0)) || 
          (data.type === 'community' && (!data.posts || data.posts.length === 0))
        ) && (
          <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} py-8`}>
            <MessageSquare className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-300'}`} />
            <p>No content available</p>
            <p className="text-sm mt-1">Try refreshing or check back later</p>
          </div>
        )}
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
