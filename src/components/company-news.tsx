'use client'

import { useState, useEffect } from 'react'
import { Newspaper, ChevronRight } from 'lucide-react'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import Link from 'next/link'

interface NewsItem {
  id: number
  title: string
  content: string
  published_at: string
  created_by: string
  created_at: string
  updated_at: string
}

export function CompanyNews() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Set isClient to true on mount to track if we're on the client
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    async function fetchNews() {
      try {
        const response = await fetch('/api/company-news')
        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`)
        }
        const data = await response.json()
        setNews(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error fetching company news data:', err)
        setError('Failed to load company news data')
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [])

  if (loading) {
    return (
      <GlassmorphismContainer className="p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-8 flex items-center">
          <Newspaper className="w-5 h-5 mr-2 text-flyadeal-yellow" />
          Company News
        </h2>
        <div className="text-gray-500 text-center py-4">
          <p>Loading company news...</p>
        </div>
      </GlassmorphismContainer>
    )
  }

  if (error) {
    return (
      <GlassmorphismContainer className="p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-8 flex items-center">
          <Newspaper className="w-5 h-5 mr-2 text-flyadeal-yellow" />
          Company News
        </h2>
        <div className="text-red-500 text-center py-4">
          <p>{error}</p>
        </div>
      </GlassmorphismContainer>
    )
  }

  // Extract category from content if possible (for display purposes)
  const getCategory = (newsItem: NewsItem) => {
    // This is a placeholder - in a real app, you might have categories stored in the database
    // For now, we'll just return a default category
    return 'Company Update'
  }

  return (
    <GlassmorphismContainer className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-8 flex items-center">
        <Newspaper className="w-5 h-5 mr-2 text-flyadeal-yellow" />
        Company News
      </h2>
      <div className="space-y-3">
        {news.length > 0 ? (
          news.map((newsItem) => (
            <Link href={`/news/${newsItem.id}`} key={newsItem.id}>
              <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex-1">
                  <div className="text-gray-800 font-medium">{newsItem.title}</div>
                  <div className="text-gray-600 text-sm">
                    {newsItem.published_at ? 
                      (isClient ? new Date(newsItem.published_at).toLocaleDateString() : 'Loading date...') 
                      : 'Date unavailable'} • {getCategory(newsItem)}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Link>
          ))
        ) : (
          <div className="text-gray-500 text-center py-4">
            <p>No company news available</p>
          </div>
        )}
      </div>
    </GlassmorphismContainer>
  )
}
