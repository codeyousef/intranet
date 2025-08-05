'use client'

import { useState, useEffect } from 'react'
import { GlassmorphismContainer } from './glassmorphism-container'
import { ExternalLink } from 'lucide-react'
import * as Icons from 'lucide-react'

export default function PlatformLinks() {
  const [links, setLinks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const response = await fetch('/api/platform-links')

        if (!response.ok) {
          throw new Error('Failed to fetch platform links')
        }

        const data = await response.json()
        // Filter out inactive links
        const activeLinks = data.filter((link: any) => link.is_active)
        // Sort by display_order
        activeLinks.sort((a: any, b: any) => a.display_order - b.display_order)

        setLinks(activeLinks)
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching platform links:', error)
        setError('Failed to load platform links')
        setIsLoading(false)
      }
    }

    fetchLinks()
  }, [])

  // If there are no links, don't render anything
  if (!isLoading && links.length === 0) {
    return null
  }

  // Dynamic icon component
  const DynamicIcon = ({ name }: { name: string }) => {
    const IconComponent = (Icons as any)[name] || Icons.Link
    return <IconComponent className="h-5 w-5" />
  }

  return (
    <GlassmorphismContainer className="p-4 mb-8">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Platform Links</h2>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-flyadeal-yellow"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 dark:text-red-400 text-center py-2">{error}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-3 bg-white/20 border border-white/20 rounded-lg hover:bg-white/30 dark:bg-gray-700/40 dark:border-gray-600/40 dark:hover:bg-gray-700/60 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-flyadeal-yellow/10 flex items-center justify-center mb-2">
                <DynamicIcon name={link.icon} />
              </div>
              <span className="text-sm text-center font-medium">{link.title}</span>
              <ExternalLink className="h-3 w-3 mt-1 text-gray-400 dark:text-gray-500" />
            </a>
          ))}
        </div>
      )}
    </GlassmorphismContainer>
  )
}
