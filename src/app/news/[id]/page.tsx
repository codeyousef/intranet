'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import { Button } from '@/components/ui/button'
import { Newspaper, Calendar, ArrowLeft, Loader2 } from 'lucide-react'

interface NewsItem {
  id: number
  title: string
  content: string
  published_at: string
  created_by: string
  created_at: string
  updated_at: string
}

export default function NewsDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNewsItem() {
      try {
        if (!params.id) {
          throw new Error('News ID is required')
        }

        const response = await fetch(`/api/company-news/${params.id}`)
        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        setNewsItem(data)
      } catch (err) {
        console.error('Error fetching news item:', err)
        setError('Failed to load news item')
      } finally {
        setLoading(false)
      }
    }

    fetchNewsItem()
  }, [params.id])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="pt-28 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-flyadeal-yellow" />
              <span className="ml-2 text-gray-600">Loading news item...</span>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !newsItem) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="pt-28 p-6">
          <div className="max-w-4xl mx-auto">
            <GlassmorphismContainer className="p-6">
              <div className="text-center py-8">
                <div className="text-red-500 mb-4">{error || 'News item not found'}</div>
                <Button 
                  onClick={() => router.back()}
                  className="flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              </div>
            </GlassmorphismContainer>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-28 p-6">
        <div className="max-w-4xl mx-auto">
          <Button 
            onClick={() => router.back()}
            variant="ghost" 
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to News
          </Button>

          <GlassmorphismContainer className="p-8">
            <div className="flex items-center space-x-2 text-flyadeal-yellow mb-2">
              <Newspaper className="w-5 h-5" />
              <span className="text-sm font-medium">Company News</span>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-4">{newsItem.title}</h1>
            
            <div className="flex items-center text-gray-500 mb-6">
              <Calendar className="w-4 h-4 mr-1" />
              <span className="text-sm">{formatDate(newsItem.published_at)}</span>
            </div>
            
            <div className="border-t border-gray-200 pt-6">
              <div className="prose max-w-none text-gray-700">
                {/* Display content with proper formatting */}
                {newsItem.content.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </GlassmorphismContainer>
        </div>
      </main>
    </div>
  )
}