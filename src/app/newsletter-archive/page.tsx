'use client'

import { useSession } from 'next-auth/react'
import { Navigation } from '@/components/navigation'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import NewsletterArchive from '@/components/newsletter-archive'

export default function NewsletterArchivePage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="pt-28 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    CEO Newsletter Archive
                  </h1>
                  <p className="text-gray-600">
                    Browse and view past CEO newsletters
                  </p>
                </div>
              </div>
            </GlassmorphismContainer>
          </div>

          {/* Newsletter Archive Component */}
          <GlassmorphismContainer className="p-6">
            {session ? (
              <NewsletterArchive context={session} />
            ) : (
              <div className="text-center py-10">
                <p>Please sign in to view the newsletter archive.</p>
              </div>
            )}
          </GlassmorphismContainer>
        </div>
      </main>
    </div>
  )
}